import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readCachedBlob, writeCachedBlob } from "@/lib/imageCache";

export async function GET(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const fileId = params.slug;

    if (!fileId) return new NextResponse("Missing file ID", { status: 400 });

    // Highly Aggressive Caching Layer
    const fileBuffer = await readCachedBlob(fileId);

    if (fileBuffer) {
      // Return instantly from lightning-fast local NVMe/SSD cache!
      const headers = new Headers();
      headers.set("Content-Type", "image/jpeg"); // Drive images are safely assumed as JPEGs for OSD
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new NextResponse(fileBuffer, { headers });
    }

    // Natively proxy through System Service Account to support Public Guests and bypass 1-hour OAuth User Session timeouts!
    const { getDriveClient } = await import('@/lib/googleAuth');
    const drive = await getDriveClient();

    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    // Convert Google's Node stream into a raw buffer array in memory
    const buffer = Buffer.from(response.data as ArrayBuffer);

    // Save binary buffer asynchronously to local filesystem to instantly cache future requests
    writeCachedBlob(fileId, buffer);

    const headers = new Headers();
    headers.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(buffer, { headers });

  } catch (error: any) {
    console.error("Secure Image Proxy Error:", error);
    return new NextResponse(error.message || "Failed to successfully proxy the image bytes", { status: 500 });
  }
}
