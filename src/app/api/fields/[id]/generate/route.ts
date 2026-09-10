import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiField } from "@/lib/aiGenerate";
import { getFieldMetrics, getOpenRun, loadFieldContext, startRun } from "@/lib/aiRuns";

// Batch AI fill for one field.
//
// GET  reports coverage so the field editor can show how much of the column is already
//      populated without running anything. ?deep=1 adds the preflight checks (image cache
//      coverage, upstream-dependency warnings), which are too expensive to run for every
//      field on page load.
// POST starts the run on the server and returns immediately. The work continues in this
//      process whether or not anyone is watching, so closing the laptop no longer stops
//      it; the page just polls GET to follow along.

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const ctx = await loadFieldContext(id);
    if (!ctx) return new NextResponse("Field not found", { status: 404 });

    const deep = new URL(req.url).searchParams.get('deep') === '1';
    const metrics = await getFieldMetrics(ctx, deep);

    const runs = await prisma.generationRun.findMany({
      where: { fieldId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const open = await getOpenRun(id);

    return NextResponse.json({ ...metrics, runs, open });
  } catch (error: any) {
    console.error("AI batch metrics error:", error);
    return new NextResponse(error.message || "Failed to read field metrics", { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "OVERWRITE" ? "OVERWRITE" : "FILL";

    const ctx = await loadFieldContext(id);
    if (!ctx) return new NextResponse("Field not found", { status: 404 });
    if (!isAiField(ctx.field)) {
      return new NextResponse("Field has no AI prompt configured", { status: 400 });
    }

    const progress = await startRun(ctx, mode);
    return NextResponse.json(progress);
  } catch (error: any) {
    console.error("AI batch execution error:", error);
    return new NextResponse(error.message || "Batch generation failed", { status: 500 });
  }
}
