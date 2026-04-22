'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { getStripe } from './stripe';
import { Money } from '@/lib/money';
import { calculateFees } from '@/lib/commission';
import { checkoutRateLimit } from './rate-limit';
import { env } from '@/lib/env';
import type { Currency } from '@prisma/client';
import { randomBytes } from 'node:crypto';

/**
 * Create a Stripe Checkout session for a single ticket type.
 * Server-authoritative: price, fees, and availability are all recomputed
 * here. The client can't force a different amount via form tampering.
 *
 * Returns nothing — on success we `redirect()` the user to Stripe; on
 * failure we throw. Called from the event detail page's form action.
 */

export async function createCheckoutSession(formData: FormData): Promise<void> {
  const ticketTypeId = String(formData.get('ticketTypeId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 1);
  const buyerEmail = String(formData.get('buyerEmail') ?? '').trim().toLowerCase();
  const buyerName = String(formData.get('buyerName') ?? '').trim();

  if (!ticketTypeId) throw new Error('Missing ticket type.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new Error('Pick between 1 and 20 tickets.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (buyerName.length < 2) throw new Error('Enter the name on the booking.');

  // ── Rate limit by IP ──────────────────────────────────────────
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkoutRateLimit(ip);
  if (!rl.ok) throw new Error('Too many checkout attempts — try again in a minute.');

  // ── Load ticket type + event + organiser + commission rule ────
  const ticketType = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: {
      event: {
        include: {
          organiser: true,
          venue: true,
        },
      },
    },
  });
  if (!ticketType) throw new Error('Ticket type not found.');
  if (ticketType.isHidden) throw new Error('That ticket type isn\'t available.');

  const event = ticketType.event;
  if (event.status !== 'ON_SALE') throw new Error('This event isn\'t on sale.');

  const remaining = ticketType.capacity - ticketType.soldCount - ticketType.reservedCount;
  if (remaining < quantity) {
    throw new Error(`Only ${remaining} left — try fewer.`);
  }
  if (quantity < ticketType.minPerOrder) throw new Error(`Minimum ${ticketType.minPerOrder} per order.`);
  if (quantity > ticketType.maxPerOrder) throw new Error(`Maximum ${ticketType.maxPerOrder} per order.`);

  // Per-organiser rule with fallback to platform default
  const rule =
    (await db.commissionRule.findFirst({
      where: {
        organiserId: event.organiserId,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    })) ??
    (await db.commissionRule.findFirst({
      where: { organiserId: null, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    }));
  if (!rule) throw new Error('No commission rule configured — contact support.');

  // ── Server-side fee calculation ───────────────────────────────
  const faceValue = Money.fromMinor(ticketType.priceFaceValue, ticketType.currency as Currency);
  const fees = calculateFees({ faceValuePerTicket: faceValue, quantity, rule });

  // ── Reserve the seats (best-effort; webhook confirms) ─────────
  //    We atomically bump `reservedCount` before creating Stripe session
  //    so a concurrent buyer can't oversell while we wait for card input.
  const reserved = await db.ticketType.updateMany({
    where: {
      id: ticketTypeId,
      soldCount: { lte: ticketType.capacity - ticketType.reservedCount - quantity },
    },
    data: { reservedCount: { increment: quantity } },
  });
  if (reserved.count === 0) throw new Error('Just sold out as you hit buy — refresh for live availability.');

  // ── Create Order (PENDING) ────────────────────────────────────
  const reference = `DRP-${randomBytes(4).toString('hex').toUpperCase()}`;
  const order = await db.order.create({
    data: {
      reference,
      buyerEmail,
      buyerName,
      eventId: event.id,
      status: 'PENDING',
      currency: ticketType.currency,
      subtotalAmount: fees.subtotal.amount,
      platformFeeAmount: fees.platformFee.amount,
      totalAmount: fees.total.amount,
      commissionRuleId: rule.id,
      commissionSnapshot: {
        percentageBps: rule.percentageBps,
        perTicketFee: rule.perTicketFee.toString(),
        feeMode: rule.feeMode,
        currency: rule.currency,
      },
      stripeConnectAccountId: event.organiser.stripeAccountId,
      ipAddress: ip,
      userAgent: h.get('user-agent') ?? null,
      items: {
        create: [
          {
            ticketTypeId,
            quantity,
            unitFaceValue: ticketType.priceFaceValue,
            unitPlatformFee: fees.platformFee.amount / BigInt(quantity),
            currency: ticketType.currency,
          },
        ],
      },
    },
  });

  // ── Create Stripe Checkout session ────────────────────────────
  const stripe = await getStripe();

  const lineItems: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; description?: string };
    };
    quantity: number;
  }> = [
    {
      price_data: {
        currency: ticketType.currency.toLowerCase(),
        unit_amount: faceValue.toStripeAmount(),
        product_data: {
          name: `${event.title} — ${ticketType.name}`,
          description: event.venue ? `${event.venue.city} · ${event.venue.name}` : undefined,
        },
      },
      quantity,
    },
  ];

  // Fee line (passed to buyer)
  if (fees.feeMode === 'PASSED_TO_BUYER' && fees.platformFee.isPositive()) {
    lineItems.push({
      price_data: {
        currency: ticketType.currency.toLowerCase(),
        unit_amount: fees.platformFee.toStripeAmount(),
        product_data: {
          name: 'Booking fee',
          description: 'Droptix platform fee',
        },
      },
      quantity: 1,
    });
  }

  const sessionParams: Record<string, unknown> = {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: buyerEmail,
    client_reference_id: order.id,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/orders/${reference}/confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`,
    metadata: {
      droptix_order_id: order.id,
      droptix_order_reference: reference,
      droptix_event_id: event.id,
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30-min reservation window
    locale: 'en-GB',
    allow_promotion_codes: false, // we'll own promos internally
  };

  // Connect organiser payouts — platform fee retained, rest transfers to organiser
  if (event.organiser.stripeAccountId && event.organiser.stripeChargesEnabled) {
    sessionParams.payment_intent_data = {
      application_fee_amount: fees.platformFee.toStripeAmount(),
      transfer_data: { destination: event.organiser.stripeAccountId },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams as never);

  await db.order.update({
    where: { id: order.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) throw new Error('Stripe didn\'t return a checkout URL.');
  redirect(session.url);
}
