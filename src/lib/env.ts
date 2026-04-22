import { z } from 'zod';

/**
 * Validated environment — fail fast at boot rather than at runtime.
 * Most third-party secrets live in the `integrations` DB table and are
 * loaded via `src/server/integrations.ts`.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),

  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_CDN_URL: z.string().url().optional(),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.string().url(),

  INTEGRATIONS_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes base64',
    }),

  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  NEXT_PUBLIC_ENABLE_RESALE: z.enum(['true', 'false']).default('false'),
  NEXT_PUBLIC_ENABLE_WALLET_PASSES: z.enum(['true', 'false']).default('true'),
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed — see above.');
  }
  return parsed.data;
}

// Build-time guard: Next.js replaces `process.env.NEXT_PUBLIC_*` at build time,
// so the client shape is a subset of the server shape.
export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
