import { describe, expect, it } from 'vitest';
import { Money, MoneyMismatchError } from './money';

describe('Money', () => {
  describe('construction', () => {
    it('builds from minor units', () => {
      expect(Money.fromMinor(1050n, 'GBP').format()).toBe('£10.50');
      expect(Money.fromMinor(0n, 'GBP').format()).toBe('£0.00');
    });

    it('builds from major string', () => {
      expect(Money.fromMajor('10.50').toMajorString()).toBe('10.50');
      expect(Money.fromMajor('10').toMajorString()).toBe('10.00');
      expect(Money.fromMajor('0.05').toMajorString()).toBe('0.05');
    });

    it('rejects malformed major strings', () => {
      expect(() => Money.fromMajor('10.5a')).toThrow();
      expect(() => Money.fromMajor('10.555')).toThrow();
      expect(() => Money.fromMajor('£10.50')).toThrow();
    });

    it('handles negative values', () => {
      expect(Money.fromMajor('-5.25').toMajorString()).toBe('-5.25');
      expect(Money.fromMinor(-525n).format()).toBe('-£5.25');
    });
  });

  describe('arithmetic', () => {
    it('adds same-currency values', () => {
      const total = Money.fromMinor(1000n).add(Money.fromMinor(525n));
      expect(total.toMajorString()).toBe('15.25');
    });

    it('refuses to add mixed currencies', () => {
      expect(() =>
        Money.fromMinor(1000n, 'GBP').add(Money.fromMinor(1000n, 'USD')),
      ).toThrow(MoneyMismatchError);
    });

    it('multiplies by integer quantity', () => {
      const perTicket = Money.fromMinor(1250n);
      expect(perTicket.multiplyByQuantity(3).toMajorString()).toBe('37.50');
    });

    it('rejects fractional quantity', () => {
      expect(() => Money.fromMinor(1000n).multiplyByQuantity(1.5)).toThrow();
    });

    it('applies bps percentage with half-up rounding', () => {
      // 5% of £22.00 = £1.10
      expect(Money.fromMajor('22.00').multiplyByBps(500).toMajorString()).toBe('1.10');
      // 7% of £1.00 = £0.07
      expect(Money.fromMajor('1.00').multiplyByBps(700).toMajorString()).toBe('0.07');
      // 7.5% of £1.00 = £0.075 → rounds to £0.08
      expect(Money.fromMajor('1.00').multiplyByBps(750).toMajorString()).toBe('0.08');
    });
  });

  describe('formatting', () => {
    it('always shows 2 dp for GBP', () => {
      expect(Money.fromMinor(1000n).format()).toBe('£10.00');
      expect(Money.fromMinor(1005n).format()).toBe('£10.05');
    });

    it('formats EUR and USD with correct locale', () => {
      expect(Money.fromMinor(2450n, 'EUR').format()).toContain('24.50');
      expect(Money.fromMinor(2450n, 'USD').format()).toBe('$24.50');
    });
  });

  describe('Stripe conversion', () => {
    it('returns an integer minor-unit amount', () => {
      expect(Money.fromMajor('24.50').toStripeAmount()).toBe(2450);
    });
  });

  describe('comparisons', () => {
    it('equality is strict on amount and currency', () => {
      expect(Money.fromMinor(1000n).equals(Money.fromMinor(1000n))).toBe(true);
      expect(Money.fromMinor(1000n, 'GBP').equals(Money.fromMinor(1000n, 'USD'))).toBe(false);
    });

    it('comparators reject mixed currencies', () => {
      expect(() =>
        Money.fromMinor(1000n, 'GBP').greaterThan(Money.fromMinor(500n, 'USD')),
      ).toThrow(MoneyMismatchError);
    });
  });
});
