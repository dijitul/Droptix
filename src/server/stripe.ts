import Stripe from 'stripe';
import { requireIntegration } from './integrations';

/**
 * Stripe client factory — reads keys from the encrypted `integrations`
 * table so the owner can rotate them from /admin/integrations without
 * redeploying.
 *
 * Each call constructs a fresh client so key rotation is picked up on
 * the next call. If this becomes a hotspot we'll add a TTL cache keyed
 * by the key fingerprint.
 */

let cachedClient: { client: Stripe; fingerprint: string } | null = null;
const CACHE_TTL_MS = 60_000;
let cachedAt = 0;

export async function getStripe(): Promise<Stripe> {
  const secretKey = await requireIntegration('STRIPE', 'secret_key');
  const fingerprint = secretKey.slice(-8);

  if (cachedClient && cachedClient.fingerprint === fingerprint && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedClient.client;
  }

  const client = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
    appInfo: {
      name: 'Droptix',
      version: process.env.npm_package_version ?? '0.1.0',
      url: 'https://droptix.co.uk',
    },
  });

  cachedClient = { client, fingerprint };
  cachedAt = Date.now();
  return client;
}

/** Publishable key for the browser — read via server action, not baked into bundle. */
export async function getStripePublishableKey(): Promise<string> {
  return requireIntegration('STRIPE', 'publishable_key');
}

/** Webhook signing secret for verifying /api/webhooks/stripe payloads. */
export async function getStripeWebhookSecret(): Promise<string> {
  return requireIntegration('STRIPE', 'webhook_secret');
}

/**
 * For Stripe Connect: organisers' Stripe account IDs are stored on the
 * Organiser row — this helper just provides a typed on-behalf-of client
 * for platform-API calls that need to act as the connected account.
 */
export async function getStripeOnBehalfOf(connectedAccountId: string): Promise<Stripe> {
  const platform = await getStripe();
  // Stripe's SDK has no per-request stripeAccount config on the client itself;
  // callers should pass `{ stripeAccount: connectedAccountId }` as the second
  // argument to individual methods. This helper exists so the pattern is obvious.
  void connectedAccountId;
  return platform;
}
