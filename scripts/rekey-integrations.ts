import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

/**
 * Usage:
 *   OLD_KEY=<current base64 key> NEW_KEY=<new base64 key> \
 *     pnpm tsx scripts/rekey-integrations.ts [--dry-run]
 *
 * Rotates INTEGRATIONS_ENCRYPTION_KEY: decrypts every `Integration` row with
 * OLD_KEY and re-encrypts it with NEW_KEY (fresh IV per row) in one
 * transaction. Run this BEFORE switching the env var and restarting the app;
 * until both have happened the app keeps working on the old key.
 *
 * Generate a key with: openssl rand -base64 32
 */

const ALGO = 'aes-256-gcm';

function loadKey(name: string): Buffer {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is not set`);
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error(`${name} must be 32 bytes base64`);
  return buf;
}

function decrypt(key: Buffer, r: { encryptedValue: string; iv: string; authTag: string }): string {
  const d = createDecipheriv(ALGO, key, Buffer.from(r.iv, 'base64'));
  d.setAuthTag(Buffer.from(r.authTag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(r.encryptedValue, 'base64')), d.final()]).toString(
    'utf8',
  );
}

function encrypt(key: Buffer, plaintext: string) {
  const iv = randomBytes(12);
  const c = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
  return {
    encryptedValue: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: c.getAuthTag().toString('base64'),
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const oldKey = loadKey('OLD_KEY');
  const newKey = loadKey('NEW_KEY');
  if (oldKey.equals(newKey)) throw new Error('OLD_KEY and NEW_KEY are identical');

  const db = new PrismaClient();
  try {
    const rows = await db.integration.findMany();
    console.log(`${rows.length} integration row(s) to re-key${dryRun ? ' (dry run)' : ''}`);

    // Decrypt everything first so a bad OLD_KEY fails before any write.
    const rekeyed = rows.map((r) => {
      const plaintext = decrypt(oldKey, r);
      // Round-trip check on the new ciphertext before it goes anywhere near the DB.
      const next = encrypt(newKey, plaintext);
      if (decrypt(newKey, next) !== plaintext) throw new Error(`round-trip failed for ${r.id}`);
      return { id: r.id, label: `${r.provider}/${r.keyName}/${r.environment}`, data: next };
    });

    if (dryRun) {
      for (const r of rekeyed) console.log(`  ok  ${r.label}`);
      return;
    }

    await db.$transaction(
      rekeyed.map((r) => db.integration.update({ where: { id: r.id }, data: r.data })),
    );
    for (const r of rekeyed) console.log(`  re-keyed  ${r.label}`);
    console.log('Done. Now set INTEGRATIONS_ENCRYPTION_KEY=NEW_KEY in the env and restart.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
