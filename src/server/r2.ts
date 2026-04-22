import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireIntegration } from './integrations';

/**
 * Cloudflare R2 client (S3-compatible).
 *
 * Keys live in the admin integrations table. R2 is only used as the
 * origin store — actual delivery + resize goes via Cloudflare Images
 * once the bucket URL is plumbed through.
 *
 * Upload flow for organiser image crop:
 *   1. Browser crops with react-image-crop (any source size, we accept)
 *   2. Calls server action → `createUploadUrl()` returns a presigned PUT
 *   3. Browser PUTs the cropped blob direct to R2
 *   4. Server inserts an Image row with the r2Key
 */

let cachedClient: S3Client | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

async function getClient(): Promise<S3Client> {
  if (cachedClient && Date.now() - cachedAt < TTL_MS) return cachedClient;

  const [accountId, accessKeyId, secretAccessKey] = await Promise.all([
    requireIntegration('CLOUDFLARE_R2', 'account_id'),
    requireIntegration('CLOUDFLARE_R2', 'access_key_id'),
    requireIntegration('CLOUDFLARE_R2', 'secret_access_key'),
  ]);

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  cachedAt = Date.now();
  return cachedClient;
}

async function getBucket(): Promise<string> {
  return requireIntegration('CLOUDFLARE_R2', 'bucket');
}

export async function createUploadUrl(params: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = await getClient();
  const bucket = await getBucket();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    }),
    { expiresIn: params.expiresInSeconds ?? 15 * 60 },
  );
}

export async function createDownloadUrl(params: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = await getClient();
  const bucket = await getBucket();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: params.key }),
    { expiresIn: params.expiresInSeconds ?? 60 * 60 },
  );
}

export async function deleteObject(key: string): Promise<void> {
  const client = await getClient();
  const bucket = await getBucket();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Public CDN URL for a stored image. Goes through Cloudflare Images /
 * our custom domain, not the raw R2 origin (which is private by default).
 */
export function publicImageUrl(key: string, variant: 'public' | 'thumb' | 'hero' = 'public'): string {
  const base = process.env.NEXT_PUBLIC_CDN_URL ?? 'https://cdn.droptix.co.uk';
  return `${base}/${variant}/${encodeURI(key)}`;
}
