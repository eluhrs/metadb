import fs from 'fs';
import path from 'path';

// The original, untiled bytes of each Drive file, keyed by Drive file ID.
//
// This is deliberately separate from the DZI pyramid under .next/cache/tiles: that one
// holds downscaled 256px tiles for OpenSeadragon and cannot be reassembled into a whole
// image to hand to an API. Anything that needs the real file (the image proxy, AI
// prompts) reads from here.
export const IMAGE_CACHE_DIR = process.env.IMAGE_CACHE_DIR || '/tmp/metadb-images';

function ensureCacheDir() {
  if (!fs.existsSync(IMAGE_CACHE_DIR)) fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
}

export function cachedBlobPath(fileId: string): string {
  return path.join(IMAGE_CACHE_DIR, `${fileId}.blob`);
}

export function hasCachedBlob(fileId: string): boolean {
  return fs.existsSync(cachedBlobPath(fileId));
}

export async function readCachedBlob(fileId: string) {
  ensureCacheDir();
  const filePath = cachedBlobPath(fileId);
  if (!fs.existsSync(filePath)) return null;
  return fs.promises.readFile(filePath);
}

// Fire-and-forget: a cache write must never fail the request that produced the bytes.
// Writes to a temp file and renames so a concurrent reader can never pick up a
// half-written blob and ship a truncated image.
export function writeCachedBlob(fileId: string, buffer: Buffer): void {
  ensureCacheDir();
  const finalPath = cachedBlobPath(fileId);
  const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;

  fs.promises.writeFile(tmpPath, buffer)
    .then(() => fs.promises.rename(tmpPath, finalPath))
    .catch((e) => {
      console.error("Image cache write error", e);
      fs.promises.unlink(tmpPath).catch(() => {});
    });
}

// Drive URLs appear either as /d/<id>/... or with an ?id=<id> query parameter.
export function extractDriveFileId(uri: string): string | null {
  const match = uri.match(/\/d\/([a-zA-Z0-9-_]+)/) || uri.match(/id=([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function deleteCachedBlob(fileId: string): Promise<boolean> {
  const filePath = cachedBlobPath(fileId);
  if (!fs.existsSync(filePath)) return false;
  await fs.promises.unlink(filePath);
  return true;
}
