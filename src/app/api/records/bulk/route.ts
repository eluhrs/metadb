import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseRangeString(str: string): number[] {
  const indexes = new Set<number>();
  const parts = str.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (!part) continue;
    
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i > 0) indexes.add(i - 1); // convert to 0-based index
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 0) {
        indexes.add(num - 1);
      }
    }
  }
  
  return Array.from(indexes).sort((a,b) => a - b);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { startRecordId, fieldId, value, rangeString } = await req.json();

    if (!startRecordId || !fieldId || !rangeString) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const targetIndexes = parseRangeString(rangeString);
    if (targetIndexes.length === 0) {
      return NextResponse.json({ success: true, appliedCount: 0 });
    }

    const startRecord = await prisma.record.findUnique({
      where: { id: startRecordId },
      select: { collectionId: true }
    });

    if (!startRecord) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    // Ensure we have a strictly deterministic chronological ordering map
    const allRecords = await prisma.record.findMany({
      where: {
        collectionId: startRecord.collectionId
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });

    const targetRecords = targetIndexes
      .map(i => allRecords[i])
      .filter(r => r !== undefined);

    const valuePromises = targetRecords.map((r: any) => {
      return prisma.value.findFirst({
        where: { recordId: r.id, fieldId }
      }).then((existing: any) => {
        if (existing) {
          return prisma.value.update({
            where: { id: existing.id },
            data: { value: value as string }
          });
        } else {
          return prisma.value.create({
            data: { recordId: r.id, fieldId, value: value as string }
          });
        }
      });
    });

    await Promise.all(valuePromises);

    return NextResponse.json({ success: true, appliedCount: targetRecords.length });
  } catch (error: any) {
    console.error("Error bulk applying:", error);
    return NextResponse.json({ error: "Bulk apply failed" }, { status: 500 });
  }
}
