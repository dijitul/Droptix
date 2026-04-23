'use server';

import { randomBytes } from 'node:crypto';
import { requireOrganiser } from './guards';
import { db } from './db';
import { createUploadTarget, publicImageUrl as storagePublicUrl, saveImageBytes } from './storage';

/**
 * Image upload orchestration.
 *
 * Works in one of two modes depending on whether R2 is configured:
 *
 *   - R2 active → client gets a presigned PUT URL, uploads direct to
 *     Cloudflare. Droptix never sees the bytes.
 *   - Local active → client POSTs the blob to /api/uploads/image, we
 *     write it under <repo>/uploads/.
 *
 * The Image row is inserted BEFORE upload so the server has a persistent
 * handle for the eventual PUT target. If upload fails we leave an
 * orphan row (rare; a periodic sweep can GC them).
 */

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 50 * 1024 * 1024;

export type CreateUploadUrlResult =
  | {
      mode: 'r2';
      uploadUrl: string;
      imageId: string;
      publicUrl: string;
      key: string;
    }
  | {
      mode: 'local';
      uploadPath: string;
      imageId: string;
      publicUrl: string;
      key: string;
      /** Short-lived token the client sends with the POST so the route
       *  can authorise writes without re-running Auth.js on each upload. */
      uploadToken: string;
    };

const LOCAL_UPLOAD_TOKENS = new Map<string, { imageId: string; expires: number }>();
const LOCAL_TOKEN_TTL_MS = 10 * 60 * 1000;

export async function createImageUploadUrl(params: {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  originalName?: string;
}): Promise<CreateUploadUrlResult> {
  const user = await requireOrganiser();

  if (!ALLOWED_MIME.has(params.mimeType)) {
    throw new Error(`Unsupported image type: ${params.mimeType}`);
  }
  if (params.sizeBytes > MAX_BYTES) {
    throw new Error('Image too large (max 50MB). Crop tighter or pick a smaller source.');
  }
  if (params.width < 100 || params.height < 100) {
    throw new Error('Image too small — hero images should be at least 1200×675.');
  }

  const membership = await db.organiserMember.findFirstOrThrow({
    where: { userId: user.id },
    select: { organiserId: true },
  });

  const ext = params.mimeType.split('/')[1]!.replace('jpeg', 'jpg');
  const rand = randomBytes(8).toString('hex');
  const now = new Date();
  const key = `org/${membership.organiserId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${rand}.${ext}`;

  const image = await db.image.create({
    data: {
      r2Key: key,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      width: params.width,
      height: params.height,
      cropX: params.cropX ?? null,
      cropY: params.cropY ?? null,
      cropWidth: params.cropWidth ?? null,
      cropHeight: params.cropHeight ?? null,
      originalName: params.originalName ?? null,
      uploadedById: user.id,
    },
  });

  let target: Awaited<ReturnType<typeof createUploadTarget>>;
  try {
    target = await createUploadTarget({
      key,
      contentType: params.mimeType,
      contentLength: params.sizeBytes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Image upload couldn't start: ${msg}`);
  }

  const publicUrl = await storagePublicUrl(image.id, key, 'hero');

  if (target.mode === 'r2') {
    return {
      mode: 'r2',
      uploadUrl: target.uploadUrl,
      imageId: image.id,
      publicUrl,
      key,
    };
  }

  // Local backend: mint a one-time token so the upload route doesn't
  // need to re-run Auth.js cookies for a binary POST.
  const uploadToken = randomBytes(24).toString('hex');
  LOCAL_UPLOAD_TOKENS.set(uploadToken, {
    imageId: image.id,
    expires: Date.now() + LOCAL_TOKEN_TTL_MS,
  });

  // Sweep expired tokens opportunistically
  for (const [t, info] of LOCAL_UPLOAD_TOKENS) {
    if (info.expires < Date.now()) LOCAL_UPLOAD_TOKENS.delete(t);
  }

  return {
    mode: 'local',
    uploadPath: target.uploadPath,
    imageId: image.id,
    publicUrl,
    key,
    uploadToken,
  };
}

/** Called from the /api/uploads/image route to swap token → imageId + validate. */
export async function consumeUploadToken(token: string): Promise<string | null> {
  const record = LOCAL_UPLOAD_TOKENS.get(token);
  if (!record) return null;
  if (record.expires < Date.now()) {
    LOCAL_UPLOAD_TOKENS.delete(token);
    return null;
  }
  LOCAL_UPLOAD_TOKENS.delete(token);
  return record.imageId;
}

/** Pure write path — called from the upload route after token validation. */
export async function persistImageBytes(imageId: string, bytes: Buffer): Promise<void> {
  const image = await db.image.findUnique({ where: { id: imageId } });
  if (!image) throw new Error('Image record not found.');
  await saveImageBytes({ key: image.r2Key, data: bytes, mimeType: image.mimeType });
}
