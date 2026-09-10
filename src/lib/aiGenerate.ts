import { GoogleGenAI, ApiError } from '@google/genai';
import { readCachedBlob, writeCachedBlob, extractDriveFileId } from "@/lib/imageCache";

// The prompt engine behind every AI-generated value. The single-record route, the batch
// runner and the dry-run preview all go through here, so a prompt resolves identically
// no matter which surface triggered it.

// Reserved template tokens for the two image slots.
const FRONT_TOKENS = ["image", "image1", "front"];
const BACK_TOKENS = ["image2", "back"];
const RESERVED_REGEX = /\{\{\s*(image|image1|image2|front|back)\s*\}\}/gi;
const FIELD_REGEX = /\{\{([^}]+)\}\}/g;

// {{image}} / {{image1}} / {{image2}} are always images. {{front}} and {{back}} are
// plausible column names in a card collection, so they yield to a real field of that
// name — otherwise adding these aliases would silently repoint existing prompts.
const HARD_TOKENS = new Set(["image", "image1", "image2"]);

// Cataloging prompts are extraction tasks -- read the card, return the value -- so the
// same card should give the same answer every run. Google's default is 1.0. Hardcoded
// for now; move it next to the model dropdown if it ever needs to vary per field.
export const AI_TEMPERATURE = 0;

// A single call gets this long before it is abandoned and retried. Without it one hung
// request stalls an entire 700-record run.
const CALL_TIMEOUT_MS = Number(process.env.AI_CALL_TIMEOUT_MS || 120_000);

// Retry budget per record. Gemini answers 429 under rate limiting and 503 when a model
// is briefly overloaded; both clear on their own within seconds.
const MAX_ATTEMPTS = Number(process.env.AI_MAX_ATTEMPTS || 4);
const BASE_BACKOFF_MS = 1_000;

// Longest edge, in pixels, that an image is downscaled to before it is sent. Unset means
// send the original bytes, which is what the manual button has always done. Gemini does
// not need a 4000px scan to read a date stamp, so setting this cuts upload time and cost
// substantially on a large run -- but it can change answers, so it is opt-in.
const IMAGE_MAX_DIM = Number(process.env.AI_IMAGE_MAX_DIM || 0);

// Everything the engine needs off a record. Callers select this so a batch can load a
// page of records in one query instead of round-tripping per record.
export const AI_RECORD_INCLUDE = {
  values: true,
  image: true,
  collection: {
    include: { fieldDefinitions: true }
  }
} as const;

export type GenerationOutcome =
  | { ok: true; text: string; attempts: number }
  | { ok: false; error: string; retryable: boolean; attempts: number };

// A field is AI-backed only with a non-empty prompt. The editor's toggle seeds aiPrompt
// with "" the moment it is switched on, so `!== null` marks fields that were opened and
// never filled in -- those are configuration in progress, not work to do.
export function isAiField(field: any): boolean {
  return typeof field?.aiPrompt === "string" && field.aiPrompt.trim() !== "" && !!field?.aiModel;
}

// Blank is two states in this schema: no Value row at all (the global overwrite route
// deletes rows) or a row holding an empty string (the cataloging form writes those).
// Both must count as empty or a fill-blanks run silently skips records.
export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

export function valueFor(record: any, fieldId: string): string {
  const val = record.values?.find((v: any) => v.fieldId === fieldId);
  return val?.value ?? "";
}

export function vocabTerms(field: any): string[] {
  if (!field?.isControlled || !field.controlledVocabList) return [];
  return field.controlledVocabList.split('\n').map((t: string) => t.trim()).filter(Boolean);
}

// When a field carries both a Terms list and a prompt, the Terms list is the answer key:
// the prompt's job is to choose from it. Matching is case-insensitive and trimmed so a
// model answering "1890-1899 " still lands on the real term, and the canonical spelling
// from the list is what gets written.
export function checkVocab(field: any, text: string): { constrained: boolean; matched: string | null } {
  const terms = vocabTerms(field);
  if (terms.length === 0) return { constrained: false, matched: null };

  const needle = text.trim().toLowerCase();
  const hit = terms.find(t => t.toLowerCase() === needle);
  return { constrained: true, matched: hit ?? null };
}

// Gemini rejects a mismatched mimeType, so read it off the magic bytes rather than
// assuming JPEG — card backs are frequently scanned as PNG.
export function sniffMimeType(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a") return "image/png";
  if (buf.length >= 6 && buf.toString("ascii", 0, 6).startsWith("GIF8")) return "image/gif";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand.startsWith("hei") || brand.startsWith("mif1") || brand.startsWith("msf1")) return "image/heic";
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
  }
  return "image/jpeg";
}

// Mirrors the resolution order used by the cataloging viewer (collections/[id]/page.tsx):
// the mapped column's own value wins, with the legacy Image row as the fallback. Records
// imported from a sheet often have no Image row at all, so reading Image alone silently
// sent no picture.
export function resolveImageUri(record: any, slot: "front" | "back"): string | null {
  const fieldDef = record.collection.fieldDefinitions.find((f: any) =>
    slot === "front" ? f.isFile : f.isSecondaryFile
  );

  if (fieldDef) {
    const val = record.values.find((v: any) => v.fieldId === fieldDef.id);
    if (val?.value && val.value.trim() !== "") return val.value;
  }

  const legacy = slot === "front" ? record.image?.uri : record.image?.secondaryUri;
  return legacy || null;
}

async function downscale(buffer: Buffer): Promise<Buffer> {
  if (!IMAGE_MAX_DIM) return buffer;
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buffer)
      .rotate() // Honour EXIF orientation before resizing, as the tiler does.
      .resize(IMAGE_MAX_DIM, IMAGE_MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (e) {
    // A format sharp cannot decode is not worth failing the whole record over.
    console.warn("AI image downscale failed, sending original bytes:", e);
    return buffer;
  }
}

export async function fetchImageBuffer(uri: string): Promise<Buffer | null> {
  const fileId = extractDriveFileId(uri);
  if (!fileId) return null;

  const cached = await readCachedBlob(fileId);
  if (cached) return downscale(cached);

  // Authenticate as the service account, matching the image proxy and the pre-cache
  // route. The user's OAuth token expires after an hour, which used to make image
  // prompts silently degrade to text-only partway through a cataloging session.
  const { getDriveClient } = await import('@/lib/googleAuth');
  const drive = await getDriveClient();

  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data as ArrayBuffer);

  // Cache the untouched original; downscaling is a transport decision, not a storage one.
  writeCachedBlob(fileId, buffer);

  return downscale(buffer);
}

export type ResolvedPrompt = {
  text: string;
  wantsFront: boolean;
  wantsBack: boolean;
  missingFields: string[];
};

// Substitutes {{Field Name}} tokens and reports which image slots the prompt asked for.
// Pure: no database or network access, so the dry-run preview can show the exact text
// that would be sent without spending a call.
export function resolvePrompt(record: any, field: any): ResolvedPrompt {
  const fieldDefs = record.collection.fieldDefinitions;
  const fieldNames = new Set(fieldDefs.map((f: any) => f.name.toLowerCase()));
  const isImageToken = (token: string) => HARD_TOKENS.has(token) || !fieldNames.has(token);

  const requestedTokens = new Set(
    [...field.aiPrompt.matchAll(RESERVED_REGEX)].map((m: any) => m[1].toLowerCase()).filter(isImageToken)
  );
  const wantsFront = FRONT_TOKENS.some(t => requestedTokens.has(t));
  const wantsBack = BACK_TOKENS.some(t => requestedTokens.has(t));

  const missingFields: string[] = [];

  // Replaced with a callback rather than a string: a card value containing $& or $1 would
  // otherwise be treated as a replacement pattern and mangle the prompt.
  let text = field.aiPrompt.replace(FIELD_REGEX, (whole: string, inner: string) => {
    const token = inner.trim();
    if (requestedTokens.has(token.toLowerCase())) return whole; // An image slot; stripped below.

    const matched = fieldDefs.find((f: any) => f.name.toLowerCase() === token.toLowerCase());
    if (!matched) return whole; // Unknown token: leave it visible rather than silently blanking it.

    const val = valueFor(record, matched.id);
    if (isBlank(val)) missingFields.push(matched.name);
    return val;
  });

  // Strip the reserved placeholders now that they are carried as dedicated binary parts,
  // so the model never sees the raw {{...}} syntax.
  if (wantsFront || wantsBack) {
    text = text.replace(RESERVED_REGEX, "").trim();
  }

  return { text, wantsFront, wantsBack, missingFields };
}

function isRetryable(error: any): boolean {
  if (error instanceof ApiError) {
    return error.status === 429 || error.status >= 500;
  }
  const name = error?.name || "";
  const message = String(error?.message || "");
  if (name === "AbortError" || name === "TimeoutError") return true;
  return /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(message);
}

function backoffMs(attempt: number): number {
  // Exponential with jitter, so a batch that hits a rate limit does not resume in lockstep.
  const base = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
  return base + Math.floor(Math.random() * base);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Runs one record's prompt against Gemini, retrying the failures that clear on their own.
// Never throws: a run over hundreds of records needs a per-record verdict, not an
// exception that takes the batch down with it.
export async function generateForRecord(record: any, field: any): Promise<GenerationOutcome> {
  if (!isAiField(field)) {
    return { ok: false, error: "Field is not configured for AI generation", retryable: false, attempts: 0 };
  }
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, error: "GEMINI_API_KEY is not configured", retryable: false, attempts: 0 };
  }

  const prompt = resolvePrompt(record, field);

  let frontBuffer: Buffer | null = null;
  let backBuffer: Buffer | null = null;

  try {
    if (prompt.wantsFront) {
      const uri = resolveImageUri(record, "front");
      if (uri) frontBuffer = await fetchImageBuffer(uri);
      if (!frontBuffer) console.warn(`AI prompt for field ${field.name} requested Image 1, but record ${record.id} resolved none (uri: ${uri ?? "unmapped"})`);
    }
    if (prompt.wantsBack) {
      const uri = resolveImageUri(record, "back");
      if (uri) backBuffer = await fetchImageBuffer(uri);
      if (!backBuffer) console.warn(`AI prompt for field ${field.name} requested Image 2, but record ${record.id} resolved none (uri: ${uri ?? "unmapped"})`);
    }
  } catch (e: any) {
    // A Drive failure is worth retrying at the batch level, but not worth burning the
    // Gemini call that would follow it.
    return { ok: false, error: `Image fetch failed: ${e.message || e}`, retryable: true, attempts: 0 };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contents: any[] = [prompt.text];

  // Only label the parts when both sides are present — a single image keeps the exact
  // payload shape existing {{image}} prompts were tuned against.
  const labelParts = !!(frontBuffer && backBuffer);

  if (frontBuffer) {
    if (labelParts) contents.push("Image 1 — front of the card:");
    contents.push({ inlineData: { data: frontBuffer.toString("base64"), mimeType: sniffMimeType(frontBuffer) } });
  }
  if (backBuffer) {
    if (labelParts) contents.push("Image 2 — back of the card:");
    contents.push({ inlineData: { data: backBuffer.toString("base64"), mimeType: sniffMimeType(backBuffer) } });
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: field.aiModel,
        contents,
        config: {
          temperature: AI_TEMPERATURE,
          httpOptions: { timeout: CALL_TIMEOUT_MS },
        },
      });

      const text = (response.text ?? "").trim();
      if (text === "") {
        // An empty answer is usually a safety block or a truncated response. Retrying at
        // temperature 0 will not change it, so fail fast and surface it in the run log.
        return { ok: false, error: "Model returned an empty response", retryable: false, attempts: attempt };
      }
      return { ok: true, text, attempts: attempt };
    } catch (e: any) {
      lastError = e;
      if (!isRetryable(e) || attempt === MAX_ATTEMPTS) break;
      await sleep(backoffMs(attempt));
    }
  }

  const status = lastError instanceof ApiError ? ` (HTTP ${lastError.status})` : "";
  return {
    ok: false,
    error: `${lastError?.message || "Gemini call failed"}${status}`,
    retryable: isRetryable(lastError),
    attempts: MAX_ATTEMPTS,
  };
}

// Bounded-concurrency map. Keeps a batch from opening one socket per record while still
// overlapping the Drive fetch of the next card with the Gemini call of the current one.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}
