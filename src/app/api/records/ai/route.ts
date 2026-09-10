import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AI_RECORD_INCLUDE, generateForRecord, isAiField } from "@/lib/aiGenerate";

// Single-record generation, triggered by the sparkle button on the cataloging form. The
// prompt engine itself lives in @/lib/aiGenerate so the batch runner and the dry-run
// preview resolve prompts exactly the same way.
//
// Note this route does not persist anything: the form merges the text into its own state
// and saves through /api/records, which keeps the value editable before it is committed.
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
      include: AI_RECORD_INCLUDE
    });

    if (!record) return new NextResponse("Record not found", { status: 404 });

    const targetField = record.collection.fieldDefinitions.find((f: any) => f.id === fieldId);
    if (!targetField) return new NextResponse("Target field definition not found", { status: 404 });
    if (!isAiField(targetField)) {
      return new NextResponse("Field is not explicitly configured for AI generative automation", { status: 400 });
    }

    const outcome = await generateForRecord(record, targetField);
    if (!outcome.ok) {
      return new NextResponse(outcome.error, { status: 500 });
    }

    return NextResponse.json({ text: outcome.text });

  } catch (error: any) {
    console.error("AI Evaluation Pipeline Error:", error);
    return new NextResponse(error.message || "Failed computing Gemini architecture stream", { status: 500 });
  }
}
