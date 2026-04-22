/**
 * Money — the only way to represent currency values in Droptix.
 *
 * Invariants:
 *   1. Amount is always `bigint` minor units (pence for GBP, cents for EUR/USD).
 *   2. Currency is always explicit — no "assumed GBP" anywhere.
 *   3. No `number`, no `parseFloat`, no `Decimal`. The legacy Laravel
 *      script stored prices as FLOAT; that's the class of bug we're
 *      designing out at the type level.
 *   4. Arithmetic returns new instances. Instances are immutable.
 *
 * DO NOT:
 *   - `new Money(10.50, 'GBP')` — pass 1050, not 10.50
 *   - `Number(money.amount)` for display — use `.format()`
 *   - mix currencies without an explicit conversion step
 */

export type Currency = 'GBP' | 'EUR' | 'USD';

const MINOR_UNITS: Record<Currency, number> = {
  GBP: 2,
  EUR: 2,
  USD: 2,
};

const LOCALE_FOR: Record<Currency, string> = {
  GBP: 'en-GB',
  EUR: 'en-IE',
  USD: 'en-US',
};

export class MoneyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = 'MoneyMismatchError';
  }
}

export class Money {
  readonly amount: bigint;
  readonly currency: Currency;

  private constructor(amount: bigint, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
  }

  /** Construct from minor units (pence). This is the canonical path. */
  static fromMinor(amount: bigint | number, currency: Currency = 'GBP'): Money {
    const asBigInt = typeof amount === 'bigint' ? amount : BigInt(Math.trunc(amount));
    return new Money(asBigInt, currency);
  }

  /**
   * Construct from a major-unit string like "10.50" or "10". Strict — throws
   * on any format the user could have mistyped. Intended for admin-panel inputs,
   * never for payment logic.
   */
  static fromMajor(value: string, currency: Currency = 'GBP'): Money {
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
      throw new Error(`Money.fromMajor: invalid input "${value}"`);
    }
    const minorUnits = MINOR_UNITS[currency];
    const [whole, fraction = ''] = trimmed.split('.');
    const padded = fraction.padEnd(minorUnits, '0');
    const sign = whole?.startsWith('-') ? -1n : 1n;
    const wholeAbs = BigInt((whole ?? '0').replace(/^-/, ''));
    const fracBig = BigInt(padded);
    const amount = sign * (wholeAbs * 10n ** BigInt(minorUnits) + fracBig);
    return new Money(amount, currency);
  }

  static zero(currency: Currency = 'GBP'): Money {
    return new Money(0n, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  /** Multiply by a *quantity* (an integer — number of tickets, etc.). */
  multiplyByQuantity(quantity: number | bigint): Money {
    if (typeof quantity === 'number' && !Number.isInteger(quantity)) {
      throw new Error('Money.multiplyByQuantity: quantity must be an integer');
    }
    const q = typeof quantity === 'bigint' ? quantity : BigInt(quantity);
    return new Money(this.amount * q, this.currency);
  }

  /**
   * Multiply by basis points (1/100th of a percent).
   * 500 bps = 5%. Used for percentage-based commissions.
   * Rounds half-up — the conventional choice for consumer money.
   */
  multiplyByBps(bps: number): Money {
    if (!Number.isInteger(bps) || bps < 0) {
      throw new Error('Money.multiplyByBps: bps must be a non-negative integer');
    }
    const b = BigInt(bps);
    // Half-up rounding on division by 10_000
    const product = this.amount * b;
    const half = 5000n;
    const rounded =
      product >= 0n ? (product + half) / 10000n : -(((-product) + half) / 10000n);
    return new Money(rounded, this.currency);
  }

  isZero(): boolean {
    return this.amount === 0n;
  }

  isPositive(): boolean {
    return this.amount > 0n;
  }

  isNegative(): boolean {
    return this.amount < 0n;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  /** Display as locale-aware currency string, e.g. "£24.50". */
  format(): string {
    const minor = MINOR_UNITS[this.currency];
    const divisor = 10n ** BigInt(minor);
    const whole = this.amount / divisor;
    const remainder = this.amount < 0n ? -this.amount % divisor : this.amount % divisor;
    const asNumber = Number(whole) + Number(remainder) / Number(divisor);
    return new Intl.NumberFormat(LOCALE_FOR[this.currency], {
      style: 'currency',
      currency: this.currency,
    }).format(asNumber);
  }

  /** "22.50" — for form inputs. No symbol, no grouping. */
  toMajorString(): string {
    const minor = MINOR_UNITS[this.currency];
    const sign = this.amount < 0n ? '-' : '';
    const absValue = this.amount < 0n ? -this.amount : this.amount;
    const divisor = 10n ** BigInt(minor);
    const whole = absValue / divisor;
    const fraction = (absValue % divisor).toString().padStart(minor, '0');
    return `${sign}${whole}.${fraction}`;
  }

  /** Minor-unit value for Stripe. Stripe wants an integer number — safe
   *  because our max single-ticket value is comfortably < 2^53. */
  toStripeAmount(): number {
    if (this.amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('Money.toStripeAmount: value exceeds MAX_SAFE_INTEGER');
    }
    return Number(this.amount);
  }

  toJSON(): { amount: string; currency: Currency } {
    return { amount: this.amount.toString(), currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new MoneyMismatchError(this.currency, other.currency);
    }
  }
}
