import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "LIBRARIAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google Access Token" }, { status: 401 });
    }

    const { name, externalSheetUrl, imageStrategy = "URI" } = await req.json();

    if (!name || !externalSheetUrl) {
      return NextResponse.json({ error: "Missing Collection Name or Sheet URL" }, { status: 400 });
    }

    // 1. Fetch entire Google Sheet Headers to Auto-Scaffold the Schema!
    const match = externalSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : externalSheetUrl;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A1:Z5000",
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Google Sheet was totally empty or unreachable." }, { status: 400 });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Auto-detect image UI mapping if column explicitly says "image"
    let imageUriColIndex = headers.findIndex((h: string) => h.toLowerCase().includes("image") || h.toLowerCase().includes("url"));

    // 2. Scaffold Native Collection
    const collection = await prisma.collection.create({
      data: {
        name,
        externalSheetUrl,
        imageStrategy,
        fieldDefinitions: {
          create: headers.map((headerText: string, idx: number) => ({
            name: headerText || `Column ${idx+1}`,
            isLong: false,
            isControlled: false,
            controlledMulti: false,
            isAdministrative: false,
            isFile: idx === imageUriColIndex, // Assign file rendering to auto-detected column
            isSecondaryFile: false,
            isLocked: false,
            uiOrder: idx,
            columnIndex: idx,
          })),
        },
      },
      include: {
        fieldDefinitions: true
      }
    });

    if (dataRows.length === 0) {
       return NextResponse.json({ success: true, collectionId: collection.id, recordsProcessed: 0 });
    }

    // 3. Batch Create Metadata Values
    for (const row of dataRows) {
      const record = await prisma.record.create({
        data: { collectionId: collection.id }
      });

      // Map values against auto-generated headers
      for (const def of collection.fieldDefinitions) {
        if (def.columnIndex !== null && row[def.columnIndex] !== undefined) {
          await prisma.value.create({
            data: {
              recordId: record.id,
              fieldId: def.id,
              value: row[def.columnIndex],
            }
          });
        }
      }

      // Hook explicit image URLs directly to Image relation
      if (imageStrategy === "URI" && imageUriColIndex !== -1 && row[imageUriColIndex]) {
        await prisma.image.create({
          data: {
            recordId: record.id,
            uri: row[imageUriColIndex]
          }
        });
      }
    }

    return NextResponse.json({ success: true, collectionId: collection.id, recordsProcessed: dataRows.length });
  } catch (error: any) {
    console.error("Error auto-extracting sheet schema:", error);
    return NextResponse.json({ error: error.message || "Failed to parse Google Schema" }, { status: 500 });
  }
}
