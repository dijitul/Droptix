import { Redis } from 'ioredis';
import { env } from '@/lib/env';

/**
 * Sliding-window rate limiter backed by Redis, scoped by a key you choose
 * (usually `ip:<addr>:<route>` or `user:<id>:<action>`).
 *
 * Used on checkout create (10/min per IP) and magic-link send (5/15min).
 * For very low-volume surfaces (admin actions) this is overkill — use the
 * `RateLimit` DB table there.
 */

let redis: Redis | null = null;

function getRedis(): Redis {
  if (redis) return redis;
  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is not set — rate limiting requires Redis.');
  }
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  return redis;
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: Date;
};

export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const client = getRedis();
  const { key, limit, windowSeconds } = params;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `rl:${key}`;

  // Sliding-window via sorted set. Each request is one entry scored by timestamp.
  const pipeline = client.multi();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zcard(redisKey);
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
  pipeline.expire(redisKey, windowSeconds);
  const results = (await pipeline.exec()) ?? [];

  const count = (results[1]?.[1] as number) ?? 0;
  const remaining = Math.max(0, limit - count - 1);
  const ok = count < limit;

  return {
    ok,
    remaining,
    resetAt: new Date(now + windowSeconds * 1000),
  };
}

/** Convenience helper for common surface — checkout session creation. */
export async function checkoutRateLimit(ip: string): Promise<RateLimitResult> {
  return rateLimit({ key: `ip:${ip}:checkout`, limit: 10, windowSeconds: 60 });
}

/** Magic-link request limiter — mitigates email bombing abuse. */
export async function magicLinkRateLimit(emailOrIp: string): Promise<RateLimitResult> {
  return rateLimit({ key: `mlink:${emailOrIp}`, limit: 5, windowSeconds: 15 * 60 });
}
