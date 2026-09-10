import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revertRun } from "@/lib/aiRuns";

// Undo one run's writes, or redo them (?direction=redo). Both sides of every write are
// stored, so an undo is itself undoable. Either direction leaves alone -- and counts as a
// conflict -- any value that no longer matches what it expects to find, which is what
// keeps an undo of an older run from clobbering a newer one.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const runId = body.runId;
    const direction = body.direction === "redo" ? "redo" : "undo";
    if (!runId) return new NextResponse("Missing runId", { status: 400 });

    const run = await prisma.generationRun.findUnique({ where: { id: runId } });
    if (!run) return new NextResponse("Run not found", { status: 404 });
    if (run.fieldId !== id) return new NextResponse("Run does not belong to this field", { status: 400 });
    if (run.status === "RUNNING") return new NextResponse("Stop the run before undoing it", { status: 400 });
    if (direction === "undo" && run.status === "REVERTED") return new NextResponse("Run has already been reverted", { status: 400 });
    if (direction === "redo" && run.status !== "REVERTED") return new NextResponse("Only a reverted run can be redone", { status: 400 });

    const summary = await revertRun(runId, id, direction);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("AI revert error:", error);
    return new NextResponse(error.message || "Revert failed", { status: 500 });
  }
}
