import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { IntegrationProvider } from '@prisma/client';
import { env } from '@/lib/env';
import { db } from './db';

/**
 * Encrypted key vault — Stripe, Postmark, R2 etc. keys live in the DB
 * and can be rotated through the admin UI without redeploys.
 *
 * `INTEGRATIONS_ENCRYPTION_KEY` (32 bytes base64) is the one env secret
 * we can't avoid. Losing it = re-entering every integration key.
 */

const ALGO = 'aes-256-gcm';

function key(): Buffer {
  return Buffer.from(env.INTEGRATIONS_ENCRYPTION_KEY, 'base64');
}

export function encryptSecret(plaintext: string): {
  encryptedValue: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedValue: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(record: {
  encryptedValue: string;
  iv: string;
  authTag: string;
}): string {
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedValue, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// In-memory cache for the current Node process. Invalidated on writes.
const cache = new Map<string, { value: string; cachedAt: number }>();
const TTL_MS = 60_000;

function cacheKey(provider: IntegrationProvider, keyName: string, environment: string): string {
  return `${provider}:${keyName}:${environment}`;
}

export async function getIntegration(
  provider: IntegrationProvider,
  keyName: string,
  { environment = env.APP_ENV === 'production' ? 'production' : 'test' }: { environment?: string } = {},
): Promise<string | null> {
  const k = cacheKey(provider, keyName, environment);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.cachedAt < TTL_MS) return hit.value;

  // Env override — used for local dev so developers don't need to seed the DB
  // just to boot the app. Name: DROPTIX_INTEGRATION_STRIPE_SECRET_KEY, etc.
  const envKey = `DROPTIX_INTEGRATION_${provider}_${keyName.replaceAll('.', '_').toUpperCase()}`;
  const envOverride = process.env[envKey];
  if (envOverride) {
    cache.set(k, { value: envOverride, cachedAt: Date.now() });
    return envOverride;
  }

  const record = await db.integration.findUnique({
    where: { provider_keyName_environment: { provider, keyName, environment } },
  });
  if (!record) return null;

  const value = decryptSecret({
    encryptedValue: record.encryptedValue,
    iv: record.iv,
    authTag: record.authTag,
  });
  cache.set(k, { value, cachedAt: Date.now() });
  return value;
}

export async function setIntegration(params: {
  provider: IntegrationProvider;
  keyName: string;
  plaintextValue: string;
  environment?: string;
  adminId?: string;
}): Promise<void> {
  const environment = params.environment ?? (env.APP_ENV === 'production' ? 'production' : 'test');
  const encrypted = encryptSecret(params.plaintextValue);

  await db.integration.upsert({
    where: {
      provider_keyName_environment: {
        provider: params.provider,
        keyName: params.keyName,
        environment,
      },
    },
    create: {
      provider: params.provider,
      keyName: params.keyName,
      environment,
      updatedByAdminId: params.adminId,
      ...encrypted,
    },
    update: {
      updatedByAdminId: params.adminId,
      ...encrypted,
    },
  });

  cache.delete(cacheKey(params.provider, params.keyName, environment));
}

export async function requireIntegration(
  provider: IntegrationProvider,
  keyName: string,
  opts?: { environment?: string },
): Promise<string> {
  const value = await getIntegration(provider, keyName, opts);
  if (!value) {
    throw new Error(
      `Missing integration ${provider}:${keyName} — set it in admin → Integrations.`,
    );
  }
  return value;
}
