import { prisma } from "@/lib/prisma";
import { hasCachedBlob, extractDriveFileId } from "@/lib/imageCache";
import {
  AI_RECORD_INCLUDE,
  checkVocab,
  generateForRecord,
  isAiField,
  isBlank,
  mapWithConcurrency,
  resolveImageUri,
  resolvePrompt,
} from "@/lib/aiGenerate";

// Batch orchestration: which records still need work, running a slice of them, and
// undoing a run. The prompt engine itself is in @/lib/aiGenerate.
//
// A batch is driven by the client polling POST repeatedly, the same protocol the image
// pre-cache uses. Each POST does a bounded amount of work and returns progress, so no
// single request has to survive an hour. Progress lives in the GenerationRun row rather
// than in memory, so closing the tab or restarting the container loses nothing.

// One POST's worth of work: ~6 records at 3 in flight is roughly ten seconds per request.
export const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 6);
export const CONCURRENCY = Number(process.env.AI_CONCURRENCY || 3);

// If a run has written nothing at all and keeps failing, something is wrong with the key,
// the model name or the prompt. Stop rather than spend 700 calls proving it.
const FAILURE_CIRCUIT_BREAKER = Number(process.env.AI_MAX_FAILURES || 10);

export type FieldContext = {
  field: any;
  fieldDefs: any[];
  collectionId: string;
};

export async function loadFieldContext(fieldId: string): Promise<FieldContext | null> {
  const field = await prisma.fieldDefinition.findUnique({ where: { id: fieldId } });
  if (!field) return null;

  const fieldDefs = await prisma.fieldDefinition.findMany({
    where: { collectionId: field.collectionId },
    orderBy: { uiOrder: 'asc' },
  });

  return { field, fieldDefs, collectionId: field.collectionId };
}

// The column shown beside each row in the dry-run preview so you can tell which card you
// are looking at. There is no title-field concept in the schema, so take the first
// ordinary descriptive column that is not the field being generated.
export function labelFieldFor(fieldDefs: any[], targetFieldId: string): any | null {
  return fieldDefs.find((f: any) =>
    f.id !== targetFieldId && !f.isAdministrative && !f.isFile && !f.isSecondaryFile && !f.isLong
  ) ?? null;
}

// Records in the collection's canonical order -- the same createdAt ordering the bulk
// apply uses, so preview row numbers match the positions elsewhere in the app.
async function orderedRecords(collectionId: string, fieldIds: string[]) {
  return prisma.record.findMany({
    where: { collectionId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      values: {
        where: { fieldId: { in: fieldIds } },
        select: { fieldId: true, value: true },
      },
    },
  });
}

function readValue(record: any, fieldId: string): string {
  return record.values.find((v: any) => v.fieldId === fieldId)?.value ?? "";
}

export type FieldMetrics = {
  total: number;
  filled: number;
  blank: number;
  ready: boolean;
  reason?: string;
  images?: { needed: number; cached: number };
  openRunId?: string | null;
};

// Powers the coverage readout on every AI field in the editor.
//
// `deep` adds the preflight checks -- image cache coverage and upstream-dependency
// warnings -- which walk every record and stat every blob. The editor loads one of these
// per AI field on mount, so that work only happens when the AI modal actually opens.
export async function getFieldMetrics(ctx: FieldContext, deep = false): Promise<FieldMetrics> {
  const { field, fieldDefs, collectionId } = ctx;

  const records = await orderedRecords(collectionId, [field.id]);
  const total = records.length;
  const filled = records.filter(r => !isBlank(readValue(r, field.id))).length;

  const base: FieldMetrics = { total, filled, blank: total - filled, ready: true };

  if (!isAiField(field)) {
    return { ...base, ready: false, reason: "No prompt configured for this field." };
  }
  if (!process.env.GEMINI_API_KEY) {
    return { ...base, ready: false, reason: "GEMINI_API_KEY is not configured on the server." };
  }

  // Does this prompt use images? Resolving that needs a record, and any record will do
  // since the prompt text is the same for all of them.
  if (deep && total > 0) {
    const sample = await prisma.record.findFirst({
      where: { collectionId },
      orderBy: { createdAt: 'asc' },
      include: AI_RECORD_INCLUDE,
    });

    if (sample) {
      const { wantsFront, wantsBack } = resolvePrompt(sample, field);

      if (wantsFront || wantsBack) {
        const full = await prisma.record.findMany({
          where: { collectionId },
          include: AI_RECORD_INCLUDE,
        });

        const ids = new Set<string>();
        for (const rec of full) {
          for (const slot of (["front", "back"] as const)) {
            if (slot === "front" && !wantsFront) continue;
            if (slot === "back" && !wantsBack) continue;
            const uri = resolveImageUri(rec, slot);
            const id = uri ? extractDriveFileId(uri) : null;
            if (id) ids.add(id);
          }
        }

        const cached = [...ids].filter(id => hasCachedBlob(id)).length;
        base.images = { needed: ids.size, cached };
      }
    }
  }

  const openRun = await prisma.generationRun.findFirst({
    where: { fieldId: field.id, status: "RUNNING" },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  base.openRunId = openRun?.id ?? null;

  if (!deep) return base;

  // A prompt that reads another AI-backed column will quietly consume blanks if that
  // column has not been filled yet. Warn rather than block -- partial input is sometimes
  // exactly what is wanted.
  const referenced = [...String(field.aiPrompt).matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim().toLowerCase());
  const upstream = fieldDefs.filter((f: any) =>
    f.id !== field.id && isAiField(f) && referenced.includes(f.name.toLowerCase())
  );

  if (upstream.length > 0) {
    const upstreamRecords = await orderedRecords(collectionId, upstream.map((f: any) => f.id));
    const empties = upstream.filter((f: any) =>
      upstreamRecords.filter(r => isBlank(readValue(r, f.id))).length > upstreamRecords.length / 2
    );
    if (empties.length > 0) {
      base.reason = `Prompt reads ${empties.map((f: any) => f.name).join(", ")}, which ${empties.length === 1 ? "is" : "are"} itself AI-generated and mostly empty. Fill that field first.`;
    }
  }

  return base;
}

// Records this run has not touched yet. Excluding what the run already attempted is what
// makes the loop terminate: a record that failed, or that was flagged and not written,
// stays blank and would otherwise be picked up forever.
async function nextCandidates(runId: string, ctx: FieldContext, mode: string, take: number) {
  const { field, collectionId } = ctx;

  const attempted = await prisma.generationResult.findMany({
    where: { runId },
    select: { recordId: true },
  });
  const seen = new Set(attempted.map(a => a.recordId));

  const records = await orderedRecords(collectionId, [field.id]);
  const candidates = records.filter(r =>
    !seen.has(r.id) && (mode === "OVERWRITE" || isBlank(readValue(r, field.id)))
  );

  return { candidates: candidates.slice(0, take), remaining: candidates.length };
}

async function countEligible(ctx: FieldContext, mode: string): Promise<number> {
  const records = await orderedRecords(ctx.collectionId, [ctx.field.id]);
  if (mode === "OVERWRITE") return records.length;
  return records.filter(r => isBlank(readValue(r, ctx.field.id))).length;
}

export type BatchProgress = {
  runId: string;
  total: number;
  done: number;
  written: number;
  flagged: number;
  failed: number;
  complete: boolean;
  error?: string;
};

// Runs one slice of a batch and records what it did. Resumes the field's open run when
// there is one, so a reload picks up where the last tab left off instead of starting over.
export async function runBatch(ctx: FieldContext, mode: string): Promise<BatchProgress> {
  const { field } = ctx;

  let run = await prisma.generationRun.findFirst({
    where: { fieldId: field.id, status: "RUNNING" },
    orderBy: { createdAt: 'desc' },
  });

  if (!run) {
    run = await prisma.generationRun.create({
      data: {
        fieldId: field.id,
        collectionId: ctx.collectionId,
        mode,
        status: "RUNNING",
        promptSnapshot: field.aiPrompt ?? "",
        model: field.aiModel ?? "",
        total: await countEligible(ctx, mode),
      },
    });
  }

  const { candidates, remaining } = await nextCandidates(run.id, ctx, run.mode, BATCH_SIZE);

  if (candidates.length === 0) {
    const finished = await prisma.generationRun.update({
      where: { id: run.id },
      data: { status: "COMPLETE" },
    });
    const done = await prisma.generationResult.count({ where: { runId: run.id } });
    return {
      runId: run.id,
      total: Math.max(finished.total, done),
      done,
      written: finished.written,
      flagged: finished.flagged,
      failed: finished.failed,
      complete: true,
    };
  }

  const loaded = await prisma.record.findMany({
    where: { id: { in: candidates.map(c => c.id) } },
    include: AI_RECORD_INCLUDE,
  });

  const outcomes = await mapWithConcurrency(loaded, CONCURRENCY, async (record) => ({
    record,
    outcome: await generateForRecord(record, field),
  }));

  let written = 0;
  let flagged = 0;
  let failed = 0;

  for (const { record, outcome } of outcomes) {
    if (!outcome.ok) {
      failed++;
      await prisma.generationResult.create({
        data: { runId: run.id, recordId: record.id, status: "FAILED", error: outcome.error },
      });
      continue;
    }

    // When the field also carries a Terms list, that list is the answer key. An answer
    // outside it is recorded and left unwritten rather than dropped into a controlled
    // column, so a drifting prompt shows up as flags instead of dirty data.
    const vocab = checkVocab(field, outcome.text);
    if (vocab.constrained && !vocab.matched) {
      flagged++;
      await prisma.generationResult.create({
        data: { runId: run.id, recordId: record.id, status: "FLAGGED", newValue: outcome.text },
      });
      continue;
    }

    const finalValue = vocab.matched ?? outcome.text;
    const existing = await prisma.value.findFirst({ where: { recordId: record.id, fieldId: field.id } });

    if (existing) {
      await prisma.value.update({ where: { id: existing.id }, data: { value: finalValue } });
    } else {
      await prisma.value.create({ data: { recordId: record.id, fieldId: field.id, value: finalValue } });
    }

    written++;
    await prisma.generationResult.create({
      data: {
        runId: run.id,
        recordId: record.id,
        status: "WRITTEN",
        // null means there was no Value row at all, which is what an undo has to restore.
        previousValue: existing ? existing.value : null,
        newValue: finalValue,
      },
    });
  }

  const updated = await prisma.generationRun.update({
    where: { id: run.id },
    data: {
      written: { increment: written },
      flagged: { increment: flagged },
      failed: { increment: failed },
    },
  });

  const done = await prisma.generationResult.count({ where: { runId: run.id } });
  const complete = remaining - candidates.length <= 0;

  if (updated.written === 0 && updated.failed >= FAILURE_CIRCUIT_BREAKER) {
    const lastError = outcomes.find(o => !o.outcome.ok);
    const message = lastError && !lastError.outcome.ok ? lastError.outcome.error : "repeated failures";
    await prisma.generationRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: message },
    });
    return {
      runId: run.id, total: updated.total, done,
      written: updated.written, flagged: updated.flagged, failed: updated.failed,
      complete: true,
      error: `Stopped after ${updated.failed} failures with nothing written: ${message}`,
    };
  }

  if (complete) {
    await prisma.generationRun.update({ where: { id: run.id }, data: { status: "COMPLETE" } });
  }

  return {
    runId: run.id,
    total: Math.max(updated.total, done),
    done,
    written: updated.written,
    flagged: updated.flagged,
    failed: updated.failed,
    complete,
  };
}

export type PreviewRow = {
  position: number;
  recordId: string;
  label: string;
  current: string;
  proposed: string | null;
  status: "fill" | "kept" | "flag" | "error" | "match" | "differs";
  error?: string;
};

// Dry run. Walks records in order and shows every row it passes, so the rows it would
// leave alone are visible in place rather than silently omitted. Stops once `limit`
// generations have been produced -- skipped rows cost no API call, so they are free to
// include. Writes nothing and records no run.
export async function runPreview(
  ctx: FieldContext,
  limit: number,
  compare: boolean
): Promise<PreviewRow[]> {
  const { field, fieldDefs, collectionId } = ctx;
  const labelField = labelFieldFor(fieldDefs, field.id);
  const selectIds = labelField ? [field.id, labelField.id] : [field.id];

  const records = await orderedRecords(collectionId, selectIds);

  type Slot = { position: number; recordId: string; label: string; current: string; generate: boolean };
  const slots: Slot[] = [];
  let queued = 0;

  for (let i = 0; i < records.length; i++) {
    const current = readValue(records[i], field.id);
    // Compare mode deliberately re-generates rows that already have a human value, so a
    // prompt can be checked against cards that were catalogued by hand.
    const wouldGenerate = compare ? true : isBlank(current);

    if (wouldGenerate && queued >= limit) break;

    slots.push({
      position: i + 1,
      recordId: records[i].id,
      label: labelField ? readValue(records[i], labelField.id) : "",
      current,
      generate: wouldGenerate,
    });

    if (wouldGenerate) queued++;
  }

  const toGenerate = slots.filter(s => s.generate);
  const loaded = await prisma.record.findMany({
    where: { id: { in: toGenerate.map(s => s.recordId) } },
    include: AI_RECORD_INCLUDE,
  });
  const byId = new Map(loaded.map(r => [r.id, r]));

  const generated = await mapWithConcurrency(toGenerate, CONCURRENCY, async (slot) => {
    const record = byId.get(slot.recordId);
    if (!record) return { slot, outcome: { ok: false as const, error: "Record vanished", retryable: false, attempts: 0 } };
    return { slot, outcome: await generateForRecord(record, field) };
  });

  const outcomeById = new Map(generated.map(g => [g.slot.recordId, g.outcome]));

  return slots.map(slot => {
    if (!slot.generate) {
      return {
        position: slot.position, recordId: slot.recordId, label: slot.label,
        current: slot.current, proposed: null, status: "kept" as const,
      };
    }

    const outcome = outcomeById.get(slot.recordId);
    if (!outcome || !outcome.ok) {
      return {
        position: slot.position, recordId: slot.recordId, label: slot.label,
        current: slot.current, proposed: null, status: "error" as const,
        error: outcome && !outcome.ok ? outcome.error : "No result",
      };
    }

    const vocab = checkVocab(field, outcome.text);
    if (vocab.constrained && !vocab.matched) {
      return {
        position: slot.position, recordId: slot.recordId, label: slot.label,
        current: slot.current, proposed: outcome.text, status: "flag" as const,
      };
    }

    const proposed = vocab.matched ?? outcome.text;

    if (compare && !isBlank(slot.current)) {
      const agrees = slot.current.trim().toLowerCase() === proposed.trim().toLowerCase();
      return {
        position: slot.position, recordId: slot.recordId, label: slot.label,
        current: slot.current, proposed, status: agrees ? "match" as const : "differs" as const,
      };
    }

    return {
      position: slot.position, recordId: slot.recordId, label: slot.label,
      current: slot.current, proposed, status: "fill" as const,
    };
  });
}

export type RevertSummary = { reverted: number; conflicts: number };

// Undo everything a run wrote. A value that no longer matches what the run produced was
// edited by hand afterwards, so it is left alone and reported rather than stomped.
export async function revertRun(runId: string, fieldId: string): Promise<RevertSummary> {
  const results = await prisma.generationResult.findMany({
    where: { runId, status: "WRITTEN" },
  });

  let reverted = 0;
  let conflicts = 0;

  for (const result of results) {
    const existing = await prisma.value.findFirst({
      where: { recordId: result.recordId, fieldId },
    });

    if (existing && existing.value !== result.newValue) {
      conflicts++;
      continue;
    }

    if (result.previousValue === null) {
      if (existing) await prisma.value.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.value.update({ where: { id: existing.id }, data: { value: result.previousValue } });
    } else {
      await prisma.value.create({
        data: { recordId: result.recordId, fieldId, value: result.previousValue },
      });
    }

    reverted++;
  }

  await prisma.generationRun.update({ where: { id: runId }, data: { status: "REVERTED" } });

  return { reverted, conflicts };
}
