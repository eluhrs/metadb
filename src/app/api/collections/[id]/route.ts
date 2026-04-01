import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import fs from 'fs';
import path from 'path';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "LIBRARIAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    
    // 1. Snapshot all Image URIs attached to this Collection BEFORE wiping the database
    const legacyImagesToPurge = await prisma.image.findMany({
      where: { record: { collectionId: id } },
      select: { uri: true, secondaryUri: true }
    });

    const valuesToPurge = await prisma.value.findMany({
       where: { record: { collectionId: id }, value: { contains: "drive.google.com" } },
       select: { value: true }
    });

    const allUrisToPurge = [
       ...legacyImagesToPurge.map(i => i.uri),
       ...legacyImagesToPurge.map(i => i.secondaryUri),
       ...valuesToPurge.map(v => v.value)
    ].filter(Boolean);

    console.log(`[GARBAGE COLLECTION] Preparing to shred ${allUrisToPurge.length} URIs:`, allUrisToPurge);

    // 2. Erase the relational database structures (Cascades automatically to Records, Fields, Values)
    await prisma.collection.delete({
      where: { id }
    });

    // 3. Systematically shred the orphaned local OpenSeadragon DZI tiles from the file system
    const cacheDir = path.join(/*turbopackIgnore: true*/ process.cwd(), '.next', 'cache', 'tiles');
    
    // Run asynchronously to avoid blocking the HTTP response latency for the user
    Promise.all(allUrisToPurge.map(async (uri) => {
      if (!uri) return;
      const match = uri.match(/\/d\/([a-zA-Z0-9-_]+)/) || uri.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) {
        const fileId = match[1];
        const dziXmlPath = path.join(cacheDir, `${fileId}.dzi`);
        const dziFilesPath = path.join(cacheDir, `${fileId}_files`);
        
        try {
          if (fs.existsSync(dziXmlPath)) {
            await fs.promises.unlink(dziXmlPath);
            console.log(`[GARBAGE COLLECTION] Shredded XML Tracker: ${dziXmlPath}`);
          }
          if (fs.existsSync(dziFilesPath)) {
             await fs.promises.rm(dziFilesPath, { recursive: true, force: true });
             console.log(`[GARBAGE COLLECTION] Shredded Tile Directory: ${dziFilesPath}`);
          }
        } catch (e) {
          // Swallow minor unlink failures to prevent breaking the promise chain
          console.error(`[GARBAGE COLLECTION] Failed to natively garbage collect locally cached tiles for ID: ${fileId}`, e);
        }
      } else {
        console.log(`[GARBAGE COLLECTION] Unrecognized Drive URL format, skipping regex: ${uri}`);
      }
    })).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting collection:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
