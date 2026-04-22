import { Queue, Worker, type Processor, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@/lib/env';

/**
 * BullMQ queue + worker factory.
 *
 * Queues:
 *   - email.send        — transactional mail (order confirmations, magic links)
 *   - webhook.retry     — Stripe webhooks that failed processing
 *   - image.resize      — post-upload variants (on top of Cloudflare Images)
 *   - scan.reconcile    — offline scanner sync flush
 *
 * Workers are long-running Node processes. In the `standalone` Next.js
 * deployment they run as a separate PM2 process (see ecosystem.config.cjs
 * — Phase 0c will add a second app entry for the worker).
 */

let connection: Redis | null = null;

function getConnection(): Redis {
  if (connection) return connection;
  if (!env.REDIS_URL) throw new Error('REDIS_URL is not set — queues require Redis.');
  connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  return connection;
}

export type QueueName =
  | 'email.send'
  | 'webhook.retry'
  | 'image.resize'
  | 'scan.reconcile';

const queueCache = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  const existing = queueCache.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { age: 24 * 3600, count: 1_000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
  queueCache.set(name, queue);
  return queue;
}

export function createWorker<T = unknown>(
  name: QueueName,
  processor: Processor<T>,
  opts?: { concurrency?: number },
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection: getConnection(),
    concurrency: opts?.concurrency ?? 5,
  });

  worker.on('failed', (job: Job<T> | undefined, err: Error) => {
    console.error(`[queue:${name}] job ${job?.id} failed:`, err);
  });

  worker.on('error', (err: Error) => {
    console.error(`[queue:${name}] worker error:`, err);
  });

  return worker;
}
