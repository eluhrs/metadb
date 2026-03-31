import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
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

    const cacheDir = path.join(process.cwd(), '.next', 'cache', 'metadb-images');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
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
      const cachedFilePath = path.join(cacheDir, `${fileId}.blob`);
      const errorFilePath = path.join(cacheDir, `${fileId}.error`);
      if (!fs.existsSync(cachedFilePath) && !fs.existsSync(errorFilePath)) {
        missingIds.push(fileId);
      }
    }

    return { totalFiles, missingIds, cacheDir, currentlyCached: totalFiles - missingIds.length };
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
    
    const accessToken = (session as any).accessToken;
    if (!accessToken) return new NextResponse("No Google access token available in session", { status: 401 });

    const url = new URL(req.url);
    const fieldId = url.searchParams.get('fieldId');

    const metrics = await getMetrics(resolvedParams.id, fieldId);
    if (metrics.error) return NextResponse.json({ total: 0, cached: 0, debug: metrics.error });

    const { totalFiles, missingIds, cacheDir, currentlyCached } = metrics as any;

    const BATCH_LIMIT = 15;
    const processingBatch = missingIds.slice(0, BATCH_LIMIT);

    if (processingBatch.length === 0) {
       return NextResponse.json({ total: totalFiles, cached: totalFiles });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth });

    let newlyCached = 0;

    for (const fileId of processingBatch) {
      try {
        const response = await drive.files.get({
          fileId,
          alt: 'media'
        }, { responseType: 'stream' });

        const chunks = [];
        for await (const chunk of response.data as any) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        fs.writeFileSync(path.join(cacheDir, `${fileId}.blob`), buffer);
        newlyCached++;
      } catch (err) {
        console.error(`Failed to mathematically cache physical binary blob for ${fileId}`, err);
        fs.writeFileSync(path.join(cacheDir, `${fileId}.error`), "FAILED");
        newlyCached++;
      }
    }

    return NextResponse.json({ 
       total: totalFiles, 
       cached: currentlyCached + newlyCached 
    });

  } catch (error: any) {
    console.error("Batch Cache Execution Fault:", error);
    return new NextResponse(error.message || "Failed to successfully bulk download generic Drive blobs", { status: 500 });
  }
}
