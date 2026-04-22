import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { db } from '@/server/db';
import { getStripe, getStripeWebhookSecret } from '@/server/stripe';
import { issueTicketsForOrder, releaseOrderReservation } from '@/server/ticket-issuance';
import { getQueue } from '@/server/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook — the source of truth for order state. The success
 * page is cosmetic; it can reload before this fires, and it will never
 * be hit if the buyer closes the tab. Never grant value from the
 * success page alone.
 *
 * Idempotency: we persist every event in `webhook_events` with a
 * UNIQUE constraint on `(provider, externalId)`, so a retried delivery
 * is a no-op.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const [stripe, webhookSecret] = await Promise.all([getStripe(), getStripeWebhookSecret()]);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 },
    );
  }

  // Persist for idempotency + audit
  try {
    await db.webhookEvent.create({
      data: {
        provider: 'stripe',
        externalId: event.id,
        eventType: event.type,
        payload: event as unknown as Record<string, unknown>,
      },
    });
  } catch (err) {
    // Unique violation = already processed. Return 200 so Stripe stops retrying.
    if (err instanceof Error && /Unique|unique/.test(err.message)) {
      return NextResponse.json({ ok: true, note: 'already processed' });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.droptix_order_id;
        if (!orderId) break;

        const result = await issueTicketsForOrder(orderId);

        await db.order.update({
          where: { id: orderId },
          data: { stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null },
        });

        if (result.issued.length > 0) {
          await getQueue('email.send').add('order-confirmation', { orderId });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.droptix_order_id;
        if (orderId) await releaseOrderReservation(orderId);
        break;
      }

      case 'charge.refunded':
      case 'charge.refund.updated': {
        // Phase 1a: just log it on the order. Full refund pipeline in Phase 3.
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
        if (paymentIntentId) {
          await db.order.updateMany({
            where: { stripePaymentIntentId: paymentIntentId },
            data: { status: charge.refunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
          });
        }
        break;
      }

      default:
        // Unknown event — ignore. We only handle what we care about.
        break;
    }

    await db.webhookEvent.update({
      where: { provider_externalId: { provider: 'stripe', externalId: event.id } },
      data: { processedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Mark as failed; Stripe will retry if we return non-2xx
    await db.webhookEvent.update({
      where: { provider_externalId: { provider: 'stripe', externalId: event.id } },
      data: {
        failedAttempts: { increment: 1 },
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
