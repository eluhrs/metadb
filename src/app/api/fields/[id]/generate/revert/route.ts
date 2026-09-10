import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revertRun } from "@/lib/aiRuns";

// Undo one run's writes. Values edited by hand since the run are left alone and counted
// as conflicts rather than being overwritten by the undo.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const runId = body.runId;
    if (!runId) return new NextResponse("Missing runId", { status: 400 });

    const run = await prisma.generationRun.findUnique({ where: { id: runId } });
    if (!run) return new NextResponse("Run not found", { status: 404 });
    if (run.fieldId !== id) return new NextResponse("Run does not belong to this field", { status: 400 });
    if (run.status === "REVERTED") return new NextResponse("Run has already been reverted", { status: 400 });

    const summary = await revertRun(runId, id);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("AI revert error:", error);
    return new NextResponse(error.message || "Revert failed", { status: 500 });
  }
}
