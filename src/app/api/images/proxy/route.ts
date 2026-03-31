export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) return new NextResponse("Missing url parameter", { status: 400 });

    const isGoogleDrive = targetUrl.includes("drive.google.com") || targetUrl.includes("docs.google.com");

    if (isGoogleDrive) {
      const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) || targetUrl.match(/id=([a-zA-Z0-9-_]+)/);
      const fileId = match ? match[1] : null;

      if (!fileId) return new NextResponse("Invalid Google Drive URL structure", { status: 400 });

      // Highly Aggressive Caching Layer
      const cacheDir = path.join(process.cwd(), '.next', 'cache', 'metadb-images');
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

      // If not cached, authenticate to Google and download it
      const session = await getServerSession(authOptions);
      if (!session) return new NextResponse("Unauthorized", { status: 401 });
      const accessToken = (session as any).accessToken;
      if (!accessToken) return new NextResponse("No Google access token available in session", { status: 401 });

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth });

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
    }

    const imageRes = await fetch(targetUrl);
    const headers = new Headers();
    headers.set("Content-Type", imageRes.headers.get("content-type") || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    
    return new NextResponse(imageRes.body, { headers });

  } catch (error: any) {
    console.error("Secure Image Proxy Error:", error);
    return new NextResponse(error.message || "Failed to successfully proxy the image bytes", { status: 500 });
  }
}
