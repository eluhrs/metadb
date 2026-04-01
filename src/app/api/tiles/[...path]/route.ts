import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Catch-all route to serve the .dzi files and the nested /_files/ jpeg tiles seamlessly
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams.path;
    
    // Safety check to prevent arbitrary directory traversal natively
    if (pathArray.some(segment => segment.includes('..'))) {
      return new NextResponse("Forbidden Blocked File Traversal", { status: 403 });
    }

    const filePath = path.join(process.cwd(), '.next', 'cache', 'tiles', ...pathArray);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Tile Not Found", { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);

    const headers = new Headers();
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // Automatically detect content type by extension
    if (filePath.endsWith('.dzi')) {
      headers.set("Content-Type", "application/xml");
    } else if (filePath.endsWith('.jpeg') || filePath.endsWith('.jpg')) {
      headers.set("Content-Type", "image/jpeg");
    } else {
      headers.set("Content-Type", "application/octet-stream");
    }

    return new NextResponse(fileBuffer, { headers });
    
  } catch (error: any) {
    console.error("Tile Server Fault:", error);
    return new NextResponse("Error serving dynamic tile layer", { status: 500 });
  }
}
