import { NextResponse } from 'next/server';
import { consumeUploadToken, persistImageBytes } from '@/server/images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Local-storage upload endpoint. Accepts the cropped JPEG blob as the
 * raw request body (Content-Type: image/jpeg) and writes it to disk
 * under `<repo>/uploads/...` via the storage abstraction.
 *
 * The client includes a one-time `X-Upload-Token` that was minted by
 * `createImageUploadUrl()` so we don't have to re-validate Auth.js for
 * binary POSTs. Tokens expire after 10 minutes and are consumed on use.
 */
export async function POST(req: Request): Promise<Response> {
  const token = req.headers.get('x-upload-token');
  if (!token) {
    return NextResponse.json({ error: 'Missing upload token' }, { status: 400 });
  }

  const imageId = await consumeUploadToken(token);
  if (!imageId) {
    return NextResponse.json({ error: 'Upload token invalid or expired' }, { status: 403 });
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Too large (max 50MB)' }, { status: 413 });
  }

  const arrayBuffer = await req.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  try {
    await persistImageBytes(imageId, bytes);
    return NextResponse.json({ ok: true, imageId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Write failed' },
      { status: 500 },
    );
  }
}
