/**
 * BullMQ worker entrypoint.
 *
 * Run as a separate PM2 process from the web server:
 *
 *   pnpm exec tsx src/server/workers/index.ts
 *
 * ecosystem.config.cjs has a `droptix-worker` app that spawns this with
 * production env. In dev you can run it via `pnpm worker` (alias added
 * in a later phase) alongside `pnpm dev`.
 */

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
