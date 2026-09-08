import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import fs from 'fs';
import path from 'path';
import { deleteCachedBlob, extractDriveFileId } from "@/lib/imageCache";

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

    const allUrisToPurge: string[] = [
       ...legacyImagesToPurge.map(i => i.uri),
       ...legacyImagesToPurge.map(i => i.secondaryUri),
       ...valuesToPurge.map(v => v.value)
    ].filter((uri): uri is string => !!uri);

    const candidateFileIds = new Set<string>();
    for (const uri of allUrisToPurge) {
      const fileId = extractDriveFileId(uri);
      if (fileId) candidateFileIds.add(fileId);
      else console.log(`[GARBAGE COLLECTION] Unrecognized Drive URL format, skipping regex: ${uri}`);
    }

    // 2. Erase the relational database structures (Cascades automatically to Records, Fields, Values)
    await prisma.collection.delete({
      where: { id }
    });

    // 2b. Both caches are keyed by Drive file ID, not by collection, so two collections
    // built from the same Drive folder share every cache entry. Anything still referenced
    // now that this collection's rows are gone belongs to somebody else and must survive.
    const [survivingImages, survivingValues] = await Promise.all([
      prisma.image.findMany({ select: { uri: true, secondaryUri: true } }),
      prisma.value.findMany({
        where: { value: { contains: "drive.google.com" } },
        select: { value: true }
      })
    ]);

    const survivingFileIds = new Set<string>();
    for (const uri of [
      ...survivingImages.map(i => i.uri),
      ...survivingImages.map(i => i.secondaryUri),
      ...survivingValues.map(v => v.value)
    ]) {
      if (!uri) continue;
      const fileId = extractDriveFileId(uri);
      if (fileId) survivingFileIds.add(fileId);
    }

    const fileIdsToPurge = [...candidateFileIds].filter(fileId => !survivingFileIds.has(fileId));
    const sharedCount = candidateFileIds.size - fileIdsToPurge.length;

    console.log(`[GARBAGE COLLECTION] Preparing to shred ${fileIdsToPurge.length} of ${candidateFileIds.size} files; ${sharedCount} still referenced by other collections and retained.`);

    // 3. Systematically shred the orphaned local OpenSeadragon DZI tiles from the file system
    const cacheDir = `${process.cwd()}/.next/cache/tiles`;
    
    // Run asynchronously to avoid blocking the HTTP response latency for the user
    Promise.all(fileIdsToPurge.map(async (fileId) => {
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
        // Drop the original alongside the tiles so the two caches stay in step.
        if (await deleteCachedBlob(fileId)) {
          console.log(`[GARBAGE COLLECTION] Shredded Original Blob: ${fileId}`);
        }
      } catch (e) {
        // Swallow minor unlink failures to prevent breaking the promise chain
        console.error(`[GARBAGE COLLECTION] Failed to natively garbage collect locally cached tiles for ID: ${fileId}`, e);
      }
    })).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting collection:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
