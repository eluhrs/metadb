import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { google } from "googleapis";
import fs from 'fs';
import path from 'path';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    // Removed Librarian restriction per design change
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { fields } = await req.json();
    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updates = fields.map((f: any) => {
      const isNew = f.id.startsWith('temp-');
      const payload = {
        name: f.name,
        isFile: f.isFile,
        isAdministrative: f.isAdministrative,
        isLong: f.isLong,
        isBulk: f.isBulk,
        staticText: f.staticText,
        isControlled: f.isControlled,
        controlledVocabList: f.controlledVocabList,
        controlledSeparator: f.controlledSeparator || '|',
        controlledMulti: f.controlledMulti,
        controlledAdds: f.controlledAdds,
        controlledDrop: f.controlledDrop,
        aiPrompt: f.aiPrompt,
        aiModel: f.aiModel,
        columnIndex: f.columnIndex ?? -1,
        uiOrder: f.uiOrder,
        collectionId: params.id
      };

      if (isNew) {
        return prisma.fieldDefinition.create({ data: payload });
      }

      return prisma.fieldDefinition.update({
        where: { id: f.id },
        data: payload
      });
    });

    await prisma.$transaction(updates);

    // --- BURN STATIC FIELDS INTO DATABASE ---
    const staticFields = fields.filter((f: any) => typeof f.staticText === 'string' && f.staticText.trim() !== "");
    if (staticFields.length > 0) {
       const allRecords = await prisma.record.findMany({
          where: { collectionId: params.id },
          select: { id: true }
       });
       
       if (allRecords.length > 0) {
          for (const f of staticFields) {
             // 1. Wipe old DB values for this field globally across the collection safely
             await prisma.value.deleteMany({
                where: { 
                   fieldId: f.id, 
                   record: { collectionId: params.id } 
                }
             });
             
             // 2. Insert exactly the static string natively into all collection records
             const insertPayloads = allRecords.map((r: { id: string }) => ({
                recordId: r.id,
                fieldId: f.id,
                value: f.staticText
             }));
             
             await prisma.value.createMany({
                data: insertPayloads
             });
          }
       }
    }

    // --- PROACTIVE CACHE SEEDING ---
    // Extract the new explicitly defined Image field if present
    const imageField = fields.find((f: any) => f.isFile);
    if (imageField) {
       // Search the first value utilizing this field to seed the internal Drive Cache
       const firstVal = await prisma.value.findFirst({
          where: { fieldId: imageField.id },
          orderBy: { createdAt: 'asc' }
       });
       
       if (firstVal && firstVal.value) {
          const match = firstVal.value.match(/\/d\/([a-zA-Z0-9-_]+)/) || firstVal.value.match(/id=([a-zA-Z0-9-_]+)/);
          const fileId = match ? match[1] : null;

          if (fileId) {
             const cacheDir = path.join(process.cwd(), '.next', 'cache', 'metadb-images');
             if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
             const cachedFilePath = path.join(cacheDir, `${fileId}.blob`);

             // Check if it's currently missing from global local storage
             if (!fs.existsSync(cachedFilePath)) {
                // Securely use the live PUT action's session to proactively retrieve the raw file!
                const accessToken = (session as any).accessToken;
                if (accessToken) {
                   try {
                     const auth = new google.auth.OAuth2();
                     auth.setCredentials({ access_token: accessToken });
                     const drive = google.drive({ version: 'v3', auth });

                     const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

                     const chunks = [];
                     for await (const chunk of response.data as any) {
                        chunks.push(chunk);
                     }
                     
                     // Lock the binary strictly onto disk so `<Image>` backend worker can immediately detect and compress it.
                     const buffer = Buffer.concat(chunks);
                     await fs.promises.writeFile(cachedFilePath, buffer);
                   } catch(e) {
                      console.error("Proactive thumbnail seeding failed invisibly (Google API rejected or timeout):", e);
                   }
                }
             }
          }
       }
    }

    revalidatePath(`/collections/${params.id}`);
    revalidatePath(`/dashboard/collections/${params.id}/edit`);
    revalidatePath(`/dashboard`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating fields:", error);
    return NextResponse.json({ error: "Failed to update field configurations" }, { status: 500 });
  }
}
