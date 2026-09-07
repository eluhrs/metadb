import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from '@google/genai';
import { readCachedBlob, writeCachedBlob } from "@/lib/imageCache";

// Reserved template tokens for the two image slots.
const FRONT_TOKENS = ["image", "image1", "front"];
const BACK_TOKENS = ["image2", "back"];
const RESERVED_REGEX = /\{\{\s*(image|image1|image2|front|back)\s*\}\}/gi;

// {{image}} / {{image1}} / {{image2}} are always images. {{front}} and {{back}} are
// plausible column names in a card collection, so they yield to a real field of that
// name — otherwise adding these aliases would silently repoint existing prompts.
const HARD_TOKENS = new Set(["image", "image1", "image2"]);

// Gemini rejects a mismatched mimeType, so read it off the magic bytes rather than
// assuming JPEG — card backs are frequently scanned as PNG.
function sniffMimeType(buf: Buffer): string {
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
function resolveImageUri(record: any, slot: "front" | "back"): string | null {
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

async function fetchImageBuffer(uri: string): Promise<Buffer | null> {
  const match = uri.match(/\/d\/([a-zA-Z0-9-_]+)/) || uri.match(/id=([a-zA-Z0-9-_]+)/);
  const fileId = match ? match[1] : null;
  if (!fileId) return null;

  const cached = await readCachedBlob(fileId);
  if (cached) return cached;

  // Authenticate as the service account, matching the image proxy and the pre-cache
  // route. The user's OAuth token expires after an hour, which used to make image
  // prompts silently degrade to text-only partway through a cataloging session.
  const { getDriveClient } = await import('@/lib/googleAuth');
  const drive = await getDriveClient();

  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data as ArrayBuffer);

  writeCachedBlob(fileId, buffer);

  return buffer;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { recordId, fieldId } = body;

    if (!recordId || !fieldId) {
      return new NextResponse("Missing recordId or fieldId", { status: 400 });
    }

    const record = await prisma.record.findUnique({
      where: { id: recordId },
      include: {
        values: true,
        image: true,
        collection: {
          include: { fieldDefinitions: true }
        }
      }
    });

    if (!record) return new NextResponse("Record not found", { status: 404 });

    const targetField = record.collection.fieldDefinitions.find((f: any) => f.id === fieldId);
    if (!targetField) return new NextResponse("Target field definition not found", { status: 404 });
    if (!targetField.aiPrompt || !targetField.aiModel) {
      return new NextResponse("Field is not explicitly configured for AI generative automation", { status: 400 });
    }

    let finalPrompt = targetField.aiPrompt;

    const fieldNames = new Set(record.collection.fieldDefinitions.map((f: any) => f.name.toLowerCase()));
    const isImageToken = (token: string) => HARD_TOKENS.has(token) || !fieldNames.has(token);

    const requestedTokens = new Set(
      [...finalPrompt.matchAll(RESERVED_REGEX)].map(m => m[1].toLowerCase()).filter(isImageToken)
    );
    const wantsFront = FRONT_TOKENS.some(t => requestedTokens.has(t));
    const wantsBack = BACK_TOKENS.some(t => requestedTokens.has(t));

    // Resolve dynamic text bracket variables: {{Field Name}}
    const fieldRegex = /\{\{([^}]+)\}\}/g;
    const matches = [...finalPrompt.matchAll(fieldRegex)];
    for (const match of matches) {
      const innerText = match[1].trim();
      if (requestedTokens.has(innerText.toLowerCase())) continue;

      const matchedField = record.collection.fieldDefinitions.find((f: any) => f.name.toLowerCase() === innerText.toLowerCase());
      if (matchedField) {
         const val = record.values.find((v: any) => v.fieldId === matchedField.id);
         finalPrompt = finalPrompt.replace(match[0], val ? val.value : '');
      }
    }

    // Securely acquire the image binaries if invoked explicitly
    let frontBuffer: Buffer | null = null;
    let backBuffer: Buffer | null = null;

    if (wantsFront) {
      const uri = resolveImageUri(record, "front");
      if (uri) frontBuffer = await fetchImageBuffer(uri);
      if (!frontBuffer) console.warn(`AI prompt for field ${targetField.name} requested Image 1, but record ${recordId} resolved none (uri: ${uri ?? "unmapped"})`);
    }

    if (wantsBack) {
      const uri = resolveImageUri(record, "back");
      if (uri) backBuffer = await fetchImageBuffer(uri);
      if (!backBuffer) console.warn(`AI prompt for field ${targetField.name} requested Image 2, but record ${recordId} resolved none (uri: ${uri ?? "unmapped"})`);
    }

    // Initialize Generative AI SDK payload strictly mapping the .env key
    if (!process.env.GEMINI_API_KEY) {
        return new NextResponse("Google Gemini API is wildly unconfigured in production environment variables", { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Strip the reserved placeholders out of the text now that they are carried as
    // dedicated binary parts, so the model never sees the raw {{...}} syntax.
    if (wantsFront || wantsBack) {
      finalPrompt = finalPrompt.replace(RESERVED_REGEX, "").trim();
    }

    // Map strictly standardized REST payloads onto the SDK
    const contents: any[] = [finalPrompt];

    // Only label the parts when both sides are present — a single image keeps the exact
    // payload shape existing {{image}} prompts were tuned against.
    const labelParts = !!(frontBuffer && backBuffer);

    if (frontBuffer) {
      if (labelParts) contents.push("Image 1 — front of the card:");
      contents.push({
        inlineData: {
          data: frontBuffer.toString("base64"),
          mimeType: sniffMimeType(frontBuffer)
        }
      });
    }

    if (backBuffer) {
      if (labelParts) contents.push("Image 2 — back of the card:");
      contents.push({
        inlineData: {
          data: backBuffer.toString("base64"),
          mimeType: sniffMimeType(backBuffer)
        }
      });
    }

    // Submit natively
    const response = await ai.models.generateContent({
        model: targetField.aiModel,
        contents: contents,
    });

    return NextResponse.json({ text: response.text });

  } catch (error: any) {
    console.error("AI Evaluation Pipeline Error:", error);
    return new NextResponse(error.message || "Failed computing Gemini architecture stream", { status: 500 });
  }
}
