/**
 * BullMQ worker entrypoint.
 *
 * Run as a separate PM2 process from the web server:
 *
 *   pnpm exec tsx src/server/workers/index.ts
 *
 * Unlike Next.js, tsx doesn't auto-load .env files — we read
 * .env.production manually before any module that touches env
 * (notably src/lib/env.ts, which validates at import time).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.production before importing anything that touches process.env
try {
  const envPath = resolve(process.cwd(), '.env.production');
  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
} catch (err) {
  console.warn('[worker] could not load .env.production:', err instanceof Error ? err.message : err);
}

import { createWorker } from '../queue';
import { sendOrderConfirmation } from '../emails/order-confirmation';

async function main() {
  console.log('[worker] starting…');

  const emailWorker = createWorker<{ orderId: string }>(
    'email.send',
    async (job) => {
      switch (job.name) {
        case 'order-confirmation':
          await sendOrderConfirmation(job.data.orderId);
          break;
        default:
          console.warn(`[worker] unknown email job: ${job.name}`);
      }
    },
    { concurrency: 10 },
  );

  process.on('SIGTERM', async () => {
    console.log('[worker] SIGTERM — closing workers');
    await emailWorker.close();
    process.exit(0);
  });

  console.log('[worker] ready');
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
