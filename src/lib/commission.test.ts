import { describe, expect, it } from 'vitest';
import { calculateFees, formatBreakdownLines } from './commission';
import { Money } from './money';

const defaultRule = {
  percentageBps: 500, // 5%
  perTicketFee: 50n, // £0.50
  feeMode: 'PASSED_TO_BUYER' as const,
  freeEventsZeroFee: true,
};

describe('calculateFees', () => {
  it('passes fees to buyer by default', () => {
    const fees = calculateFees({
      faceValuePerTicket: Money.fromMajor('22.00'),
      quantity: 1,
      rule: defaultRule,
    });
    // 5% of £22 = £1.10, +£0.50 = £1.60 fee; £22 + £1.60 = £23.60
    expect(fees.subtotal.format()).toBe('£22.00');
    expect(fees.platformFee.format()).toBe('£1.60');
    expect(fees.total.format()).toBe('£23.60');
  });

  it('scales fees by quantity', () => {
    const fees = calculateFees({
      faceValuePerTicket: Money.fromMajor('10.00'),
      quantity: 4,
      rule: defaultRule,
    });
    // subtotal £40, 5% = £2, +£0.50×4 = £4 fee; total £44
    expect(fees.subtotal.format()).toBe('£40.00');
    expect(fees.platformFee.format()).toBe('£4.00');
    expect(fees.total.format()).toBe('£44.00');
  });

  it('absorbs fee when configured — buyer pays face value', () => {
    const fees = calculateFees({
      faceValuePerTicket: Money.fromMajor('22.00'),
      quantity: 1,
      rule: { ...defaultRule, feeMode: 'ABSORBED_BY_ORGANISER' },
    });
    expect(fees.total.format()).toBe('£22.00');
    expect(fees.platformFee.format()).toBe('£1.60');
  });

  it('zero fee on free events when flag enabled', () => {
    const fees = calculateFees({
      faceValuePerTicket: Money.zero(),
      quantity: 2,
      rule: defaultRule,
    });
    expect(fees.total.isZero()).toBe(true);
    expect(fees.platformFee.isZero()).toBe(true);
  });

  it('charges fixed fee even for low face value', () => {
    const fees = calculateFees({
      faceValuePerTicket: Money.fromMajor('1.00'),
      quantity: 1,
      rule: defaultRule,
    });
    // 5% of £1 = £0.05, +£0.50 fixed = £0.55 fee
    expect(fees.platformFee.format()).toBe('£0.55');
  });
});

describe('formatBreakdownLines', () => {
  it('hides fee line when absorbed', () => {
    const lines = formatBreakdownLines(
      calculateFees({
        faceValuePerTicket: Money.fromMajor('22.00'),
        quantity: 1,
        rule: { ...defaultRule, feeMode: 'ABSORBED_BY_ORGANISER' },
      }),
    );
    expect(lines.some((l) => l.includes('booking fee'))).toBe(false);
  });

  it('always shows total', () => {
    const lines = formatBreakdownLines(
      calculateFees({
        faceValuePerTicket: Money.fromMajor('22.00'),
        quantity: 1,
        rule: defaultRule,
      }),
    );
    expect(lines[lines.length - 1]).toContain('Total');
  });
});
