import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { readImageBytes } from '@/server/storage';

export const runtime = 'nodejs';

/**
 * Image serving route.
 *
 * Streams back the stored bytes with a long cache TTL — Cloudflare
 * (already in front of droptix.co.uk) caches aggressively so repeat
 * requests don't hit Node. ETag + Cache-Control set for far-edge
 * behaviour to match a proper image CDN.
 *
 * When R2 is later configured, uploaded images live on Cloudflare and
 * the public URL points at a CF subdomain directly — this route only
 * serves the local-filesystem fallback.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const image = await db.image.findUnique({ where: { id } });
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const bytes = await readImageBytes(image.r2Key);
  if (!bytes) {
    return NextResponse.json({ error: 'Not found or still uploading' }, { status: 404 });
  }

  const etag = `"${image.id}-${image.sizeBytes}"`;

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': image.mimeType,
      'Content-Length': String(image.sizeBytes),
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800, immutable',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
