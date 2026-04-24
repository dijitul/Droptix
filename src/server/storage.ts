import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getIntegration } from './integrations';
import {
  createUploadUrl as r2CreateUploadUrl,
  publicImageUrl as r2PublicImageUrl,
} from './r2';
import { Readable } from 'node:stream';

/**
 * Image storage abstraction.
 *
 * Two backends, chosen at runtime based on whether Cloudflare R2 keys
 * are configured:
 *
 *   - Local filesystem (default, zero-config): writes under
 *     `<repo>/uploads/<key>`, served back via `/api/images/[id]`.
 *     Cloudflare is already in front of droptix.co.uk so the route's
 *     far-edge cache TTL gives you effective CDN behaviour for free.
 *
 *   - Cloudflare R2 (opt-in): only activated when `CLOUDFLARE_R2.*`
 *     integration keys are set. Uses presigned PUT uploads like
 *     before. The admin /integrations card still works when they
 *     decide to upgrade.
 *
 * Keeping a unified `save/read` API means the image-upload UX is
 * identical regardless of backend.
 */

const LOCAL_ROOT = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : path.resolve(process.cwd(), 'uploads');

export async function isR2Configured(): Promise<boolean> {
  const required = await Promise.all([
    getIntegration('CLOUDFLARE_R2', 'account_id'),
    getIntegration('CLOUDFLARE_R2', 'access_key_id'),
    getIntegration('CLOUDFLARE_R2', 'secret_access_key'),
    getIntegration('CLOUDFLARE_R2', 'bucket'),
  ]);
  return required.every(Boolean);
}

// ── Local backend ─────────────────────────────────────────────

async function localSave(key: string, data: Buffer): Promise<void> {
  const dest = path.join(LOCAL_ROOT, key);
  console.log(`[storage.localSave] writing ${data.length}b → ${dest}`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, data);
  console.log(`[storage.localSave] ✓ written ${dest}`);
}

async function localRead(key: string): Promise<Buffer | null> {
  const src = path.join(LOCAL_ROOT, key);
  if (!src.startsWith(LOCAL_ROOT)) {
    console.warn(`[storage.localRead] refused — path traversal? key=${key}`);
    return null;
  }
  try {
    return await fs.readFile(src);
  } catch (err) {
    console.warn(`[storage.localRead] miss ${src} (${err instanceof Error ? err.message : 'unknown'})`);
    return null;
  }
}

async function localDelete(key: string): Promise<void> {
  const target = path.join(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT)) return;
  await fs.unlink(target).catch(() => undefined);
}

// ── Unified API ───────────────────────────────────────────────

/**
 * Save a blob to whichever backend is active. Returns the storage key
 * the Image row should record (identical shape for both backends).
 */
export async function saveImageBytes(params: {
  key: string;
  data: Buffer;
  mimeType: string;
}): Promise<void> {
  if (await isR2Configured()) {
    // R2 path: client will PUT directly via presigned URL; this helper
    // isn't called there. If someone does call it, throw — the R2 flow
    // takes a separate code path.
    throw new Error('R2 is configured — use presigned PUT flow instead.');
  }
  await localSave(params.key, params.data);
}

export async function readImageBytes(key: string): Promise<Buffer | null> {
  if (await isR2Configured()) {
    // Not implemented — R2 serves via its own CDN URL, not through us.
    return null;
  }
  return localRead(key);
}

export async function deleteImage(key: string): Promise<void> {
  if (await isR2Configured()) {
    // R2 deletion handled in src/server/r2.ts's deleteObject — call it
    // here if we decide to centralise.
    return;
  }
  await localDelete(key);
}

/**
 * Produce a presigned upload URL, OR `null` if the local backend is
 * active (client should POST directly to /api/uploads/image instead).
 */
export async function createUploadTarget(params: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ mode: 'r2'; uploadUrl: string } | { mode: 'local'; uploadPath: string }> {
  if (await isR2Configured()) {
    const uploadUrl = await r2CreateUploadUrl(params);
    return { mode: 'r2', uploadUrl };
  }
  return { mode: 'local', uploadPath: '/api/uploads/image' };
}

/** Public URL a browser can fetch for a stored image. */
export async function publicImageUrl(
  imageId: string,
  key: string,
  variant: 'public' | 'thumb' | 'hero' = 'public',
): Promise<string> {
  if (await isR2Configured()) {
    return r2PublicImageUrl(key, variant);
  }
  // Local: serve through our own route, which handles cache headers
  return `/api/images/${imageId}`;
}

/** Nodejs Readable from a Buffer — used by serving route. */
export function bufferToStream(buffer: Buffer): Readable {
  return Readable.from(buffer);
}
