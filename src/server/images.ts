'use server';

import { randomBytes } from 'node:crypto';
import { requireOrganiser } from './guards';
import { db } from './db';
import { createUploadUrl, publicImageUrl } from './r2';

/**
 * Server action used by the in-browser image crop component.
 * Returns a presigned R2 PUT URL the client uses to upload the cropped
 * blob directly. Keeps Droptix out of the upload byte-stream path.
 */

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 50 * 1024 * 1024; // 50MB raw ceiling — we're not constraining sources

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
}): Promise<{ uploadUrl: string; imageId: string; publicUrl: string; key: string }> {
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

  // Scoped path: /org/<orgId>/<yyyy>/<mm>/<random>.<ext>
  const membership = await db.organiserMember.findFirstOrThrow({
    where: { userId: user.id },
    select: { organiserId: true },
  });

  const ext = params.mimeType.split('/')[1]!.replace('jpeg', 'jpg');
  const rand = randomBytes(8).toString('hex');
  const now = new Date();
  const key = `org/${membership.organiserId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${rand}.${ext}`;

  let uploadUrl: string;
  try {
    uploadUrl = await createUploadUrl({
      key,
      contentType: params.mimeType,
      contentLength: params.sizeBytes,
    });
  } catch (err) {
    // Most common cause pre-launch: R2 keys haven't been entered at
    // /admin/integrations. Convert the raw "Missing integration" message
    // into actionable copy for the organiser.
    const msg = err instanceof Error ? err.message : String(err);
    if (/Missing integration CLOUDFLARE_R2/i.test(msg)) {
      throw new Error(
        "Image uploads aren't set up yet — an admin needs to add Cloudflare R2 keys at /admin/integrations. " +
        "You can save the event without artwork and add it later.",
      );
    }
    throw new Error(`Image upload failed: ${msg}`);
  }

  // Insert Image row immediately — we trust the upload or clean up later if it fails.
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

  return {
    uploadUrl,
    imageId: image.id,
    publicUrl: publicImageUrl(key, 'hero'),
    key,
  };
}
