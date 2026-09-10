import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listRunResults, loadFieldContext } from "@/lib/aiRuns";

// The records behind a run's counts -- ?runId=<id>&status=FAILED|FLAGGED|WRITTEN.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const runId = url.searchParams.get('runId');
    const status = url.searchParams.get('status') || 'FAILED';
    if (!runId) return new NextResponse("Missing runId", { status: 400 });

    const ctx = await loadFieldContext(id);
    if (!ctx) return new NextResponse("Field not found", { status: 404 });

    const rows = await listRunResults(ctx, runId, status);
    return NextResponse.json({ rows });
  } catch (error: any) {
    console.error("AI run results error:", error);
    return new NextResponse(error.message || "Failed to read run results", { status: 500 });
  }
}
