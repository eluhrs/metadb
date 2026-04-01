import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';

async function getMetrics(collectionId: string, fieldId?: string | null) {
    let fileFields;

    if (fieldId) {
      const explicitField = await prisma.fieldDefinition.findUnique({
         where: { id: fieldId }
      });
      if (!explicitField || (!explicitField.isFile && !explicitField.isSecondaryFile)) {
         return { error: `FATAL: Postgres returned zero valid dual-file constraints matching explicitly passed Field ID: ${fieldId}` };
      }
      fileFields = [explicitField];
    } else {
      fileFields = await prisma.fieldDefinition.findMany({
        where: { collectionId, OR: [{ isFile: true }, { isSecondaryFile: true }] }
      });
    }

    if (fileFields.length === 0) return { error: "FATAL: Postgres returned zero FieldDefinitions mapped physically to `isFile: true` or `isSecondaryFile: true`. Did you execute 'Save Configuration'?" };

    const tilesDir = path.join(process.cwd(), '.next', 'cache', 'tiles');
    if (!fs.existsSync(tilesDir)) {
      fs.mkdirSync(tilesDir, { recursive: true });
    }

    const records = await prisma.record.findMany({
      where: { collectionId },
      include: {
        image: true,
        values: { where: { fieldId: { in: fileFields.map(f => f.id) } } }
      }
    });

    const googleDriveIds: string[] = [];

    for (const record of records) {
      const rawUrls: string[] = [];

      // Extract explicitly saved value mappings
      if (record.values && record.values.length > 0) {
        record.values.forEach(v => {
          if (v.value) rawUrls.push(v.value);
        });
      } 
      
      // Fallback to Image table properties strictly mapping the dual columns
      if (fileFields.some(f => f.isFile) && record.image?.uri) rawUrls.push(record.image.uri);
      if (fileFields.some(f => f.isSecondaryFile) && record.image?.secondaryUri) rawUrls.push(record.image.secondaryUri);

      // Analyze every explicitly mapped URL concurrently
      for (const uri of rawUrls) {
        const isGoogleDrive = uri.includes("drive.google.com") || uri.includes("docs.google.com");
        if (isGoogleDrive) {
          const match = uri.match(/\/d\/([a-zA-Z0-9-_]+)/) || uri.match(/id=([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
             // Deduplicate IDs purely defensively!
             if (!googleDriveIds.includes(match[1])) {
                googleDriveIds.push(match[1]);
             }
          }
        }
      }
    }

    const totalFiles = googleDriveIds.length;
    if (totalFiles === 0) {
      if (records.length === 0) {
         return { error: "FATAL: Postgres successfully loaded Collection, but physically found 0 structural Records inside it!" };
      } else {
         return { error: `FATAL: Postgres parsed ${records.length} records, but 0 Google Drive links mapped accurately! Legacy URIs checked: ${records.some(r => r.image?.uri)}` };
      }
    }

    const missingIds: string[] = [];
    for (const fileId of googleDriveIds) {
      const cachedFilePath = path.join(tilesDir, `${fileId}.dzi`);
      if (!fs.existsSync(cachedFilePath)) {
        missingIds.push(fileId);
      }
    }

    return { totalFiles, missingIds, tilesDir, currentlyCached: totalFiles - missingIds.length };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    
    const url = new URL(req.url);
    const fieldId = url.searchParams.get('fieldId');
    
    const metrics = await getMetrics(resolvedParams.id, fieldId);
    if (metrics.error) return NextResponse.json({ total: 0, cached: 0, debug: metrics.error });
    
    return NextResponse.json({ total: metrics.totalFiles, cached: metrics.currentlyCached });
  } catch (error: any) {
    console.error("GET Cache Fault:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const fieldId = url.searchParams.get('fieldId');

    const metrics = await getMetrics(resolvedParams.id, fieldId);
    if (metrics.error) return NextResponse.json({ total: 0, cached: 0, debug: metrics.error });

    const { totalFiles, missingIds, tilesDir, currentlyCached } = metrics as any;

    const BATCH_LIMIT = 5; 
    const processingBatch = missingIds.slice(0, BATCH_LIMIT);

    if (processingBatch.length === 0) {
       return NextResponse.json({ total: totalFiles, cached: totalFiles });
    }

    const { getDriveClient } = await import('@/lib/googleAuth');
    const drive = await getDriveClient();
    const sharp = (await import('sharp')).default;

    let newlyCached = 0;

    await Promise.allSettled(processingBatch.map(async (fileId: string) => {
      try {
        const response = await drive.files.get({
          fileId,
          alt: 'media'
        }, { responseType: 'arraybuffer' });

        const buffer = Buffer.from(response.data as ArrayBuffer);
        
        const dziOutputPath = path.join(tilesDir, fileId);
        await sharp(buffer)
          .rotate() // Auto-orients the image based on EXIF before tiling
          .tile({ size: 256 })
          .toFile(dziOutputPath);
          
        newlyCached++;
      } catch (err) {
        console.error(`Failed to ingest and tile ${fileId}:`, err);
      }
    }));

    // Return the correctly incremented sync response to signal the frontend's batch state!
    return NextResponse.json({ 
       total: totalFiles, 
       cached: currentlyCached + newlyCached
    });

  } catch (error: any) {
    console.error("Batch Cache Execution Fault:", error);
    return new NextResponse(error.message || "Failed to initiate deep zoom caching", { status: 500 });
  }
}
