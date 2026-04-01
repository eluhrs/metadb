import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const collectionId = params.id;
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        fieldDefinitions: { orderBy: { createdAt: 'asc' } },
        records: {
          orderBy: { createdAt: 'asc' },
          include: {
            values: true,
            image: true
          }
        }
      }
    });

    if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Sort the field configuration based on user-approved export rules
    const exportFieldsOrder = [...collection.fieldDefinitions].sort((a: any, b: any) => {
      const aIsCustom = a.columnIndex === null || a.columnIndex === -1;
      const bIsCustom = b.columnIndex === null || b.columnIndex === -1;

      // 1. If both are imported from original CSV, sort by exact native column index
      if (!aIsCustom && !bIsCustom) return a.columnIndex - b.columnIndex;
      
      // 2. Original columns ALWAYS predate manually appended columns
      if (!aIsCustom && bIsCustom) return -1;
      if (aIsCustom && !bIsCustom) return 1;
      
      // 3. For any randomly appended manual fields, arrange them by the Drag-and-Drop GUI hierarchy!
      return (a.uiOrder || 0) - (b.uiOrder || 0);
    });

    // Generate CSV
    const headers = [...exportFieldsOrder.map((f: any) => {
      const isCustom = f.columnIndex === null || f.columnIndex === -1;
      return isCustom ? `metadb_${f.name}` : f.name;
    })];
    
    let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    const imageUriField = exportFieldsOrder.find((f: any) => f.isFile);

    for (const record of collection.records) {
      let activeImageUri = record.image?.uri || record.image?.localPath || "";
      if (imageUriField) {
         const val = record.values.find((v: any) => v.fieldId === imageUriField.id);
         if (val && val.value) activeImageUri = val.value;
      }

      const row: string[] = [];

      for (const def of exportFieldsOrder) {
        const val = record.values.find((v: any) => v.fieldId === def.id);
        const cellStr = val ? `"${val.value.replace(/"/g, '""')}"` : '""';
        row.push(cellStr);
      }

      csvContent += row.join(",") + "\n";
    }

    const safeFilename = collection.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const finalFilename = safeFilename.endsWith('.csv') ? safeFilename : `${safeFilename}_export.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${finalFilename}"`,
      }
    });
  } catch (error: any) {
    console.error("Export error:", error);
    try { require('fs').writeFileSync('/tmp/export-fail.log', error.stack || error.message); } catch (e) {}
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
