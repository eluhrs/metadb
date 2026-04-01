import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

import fs from 'fs';
import path from 'path';

export async function GET(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const fileId = params.slug;

    if (!fileId) return new NextResponse("Missing file ID", { status: 400 });

    // Highly Aggressive Caching Layer
    const cacheDir = path.join(/*turbopackIgnore: true*/ process.cwd(), '.next', 'cache', 'metadb-images');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cachedFilePath = path.join(cacheDir, `${fileId}.blob`);

    if (fs.existsSync(cachedFilePath)) {
      // Return instantly from lightning-fast local NVMe/SSD cache!
      const fileBuffer = await fs.promises.readFile(cachedFilePath);
      const headers = new Headers();
      headers.set("Content-Type", "image/jpeg"); // Drive images are safely assumed as JPEGs for OSD
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new NextResponse(fileBuffer, { headers });
    }

    // If not cached, the Server Service Account natively proxies it on behalf of the public user!

    const { getDriveClient } = await import('@/lib/googleAuth');
    const drive = await getDriveClient();

    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'stream' });

    // Convert Google's Node stream into a raw buffer array in memory
    const chunks = [];
    for await (const chunk of response.data as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Save binary buffer asynchronously to local filesystem to instantly cache future requests
    fs.promises.writeFile(cachedFilePath, buffer).catch(console.error);

    const headers = new Headers();
    headers.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(buffer, { headers });

  } catch (error: any) {
    console.error("Secure Image Proxy Error:", error);
    return new NextResponse(error.message || "Failed to successfully proxy the image bytes", { status: 500 });
  }
}
