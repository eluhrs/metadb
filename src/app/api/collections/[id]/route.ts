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

    // 3. Systematically shred the orphaned multi-megabyte .blob files from the local Proxy Cache
    const cacheDir = path.join(process.cwd(), '.next', 'cache', 'metadb-images');
    
    // Run asynchronously to avoid blocking the HTTP response latency for the user
    Promise.all(allUrisToPurge.map(async (uri) => {
      if (!uri) return;
      const match = uri.match(/\/d\/([a-zA-Z0-9-_]+)/) || uri.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) {
        const fileId = match[1];
        const blobPath = path.join(cacheDir, `${fileId}.blob`);
        const errorPath = path.join(cacheDir, `${fileId}.error`);
        console.log(`[GARBAGE COLLECTION] Target Payload: ${blobPath}`);
        try {
          if (fs.existsSync(blobPath)) {
            await fs.promises.unlink(blobPath);
            console.log(`[GARBAGE COLLECTION] Successfully shredded: ${fileId}.blob`);
          }
          if (fs.existsSync(errorPath)) {
            await fs.promises.unlink(errorPath);
          }
        } catch (e) {
          // Swallow minor unlink failures to prevent breaking the promise chain
          console.error(`[GARBAGE COLLECTION] Failed to natively garbage collect orphaned blob: ${fileId}.blob`, e);
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
