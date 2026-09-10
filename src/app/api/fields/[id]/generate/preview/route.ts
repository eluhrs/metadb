import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAiField } from "@/lib/aiGenerate";
import { labelFieldFor, loadFieldContext, runPreview } from "@/lib/aiRuns";

// Dry run: generates for a handful of records, writes nothing, records no run. This is
// the tune-the-prompt loop -- see what the prompt would do before spending 700 calls on it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 25);
    const compare = body.compare === true;

    const ctx = await loadFieldContext(id);
    if (!ctx) return new NextResponse("Field not found", { status: 404 });
    if (!isAiField(ctx.field)) {
      return new NextResponse("Save a prompt and model before previewing", { status: 400 });
    }

    const rows = await runPreview(ctx, limit, compare);
    const labelField = labelFieldFor(ctx.fieldDefs, ctx.field.id);

    return NextResponse.json({ rows, labelName: labelField?.name ?? "Record" });
  } catch (error: any) {
    console.error("AI preview error:", error);
    return new NextResponse(error.message || "Preview failed", { status: 500 });
  }
}
