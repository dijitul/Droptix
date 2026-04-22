import type { CommissionRule, FeeMode } from '@prisma/client';
import { Money, type Currency } from './money';

/**
 * Turn a commission rule + a ticket into a concrete fee breakdown.
 *
 * Always computed server-side at Stripe Checkout session create time.
 * Never trust a client-submitted fee.
 */

export type FeeBreakdown = {
  subtotal: Money;           // face value × quantity
  platformFee: Money;        // our take
  total: Money;              // what the buyer pays
  feeMode: FeeMode;
};

export function calculateFees(params: {
  faceValuePerTicket: Money;
  quantity: number;
  rule: Pick<CommissionRule, 'percentageBps' | 'perTicketFee' | 'feeMode' | 'freeEventsZeroFee'>;
}): FeeBreakdown {
  const { faceValuePerTicket, quantity, rule } = params;
  const currency = faceValuePerTicket.currency;
  const subtotal = faceValuePerTicket.multiplyByQuantity(quantity);

  // Free event carve-out — brand promise.
  if (rule.freeEventsZeroFee && faceValuePerTicket.isZero()) {
    return {
      subtotal,
      platformFee: Money.zero(currency),
      total: subtotal,
      feeMode: rule.feeMode,
    };
  }

  const percentComponent = subtotal.multiplyByBps(rule.percentageBps);
  const fixedComponent = Money.fromMinor(rule.perTicketFee, currency).multiplyByQuantity(quantity);
  const platformFee = percentComponent.add(fixedComponent);

  const total =
    rule.feeMode === 'PASSED_TO_BUYER'
      ? subtotal.add(platformFee)
      : subtotal; // absorbed: buyer pays face value, organiser's net drops

  return { subtotal, platformFee, total, feeMode: rule.feeMode };
}

/**
 * Pretty breakdown lines for checkout display.
 * DMCC 2024 + CMA guidance: fees must be visible before the pay action.
 */
export function formatBreakdownLines(b: FeeBreakdown): string[] {
  const lines: string[] = [`${b.subtotal.format()} ticket${b.subtotal.isZero() ? '' : 's'}`];
  if (!b.platformFee.isZero() && b.feeMode === 'PASSED_TO_BUYER') {
    lines.push(`${b.platformFee.format()} booking fee`);
  }
  lines.push(`Total: ${b.total.format()}`);
  return lines;
}

export function resolveCurrency(rule: Pick<CommissionRule, 'currency'>): Currency {
  return rule.currency as Currency;
}
