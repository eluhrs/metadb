import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cancelRun } from "@/lib/aiRuns";

// Stops the field's open run. The worker checks the run status at the top of each slice,
// so records already in flight finish and are recorded; nothing new is started.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const cancelled = await cancelRun(id);
    return NextResponse.json({ cancelled });
  } catch (error: any) {
    console.error("AI cancel error:", error);
    return new NextResponse(error.message || "Cancel failed", { status: 500 });
  }
}
