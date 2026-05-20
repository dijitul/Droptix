'use client';

import { useState, useMemo, useTransition } from 'react';
import { Minus, Plus, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { createCheckoutSession } from '@/server/checkout';
import { toast } from 'sonner';

type TicketTypeView = {
  id: string;
  name: string;
  priceFaceValue: string; // BigInt serialised to string for client
  currency: Currency;
  remaining: number;
  minPerOrder: number;
  maxPerOrder: number;
  // Sales window + manual pause. All three optional / nullable.
  isPaused: boolean;
  salesStartAt: string | null;   // ISO UTC
  salesEndAt: string | null;     // ISO UTC
};

type Availability =
  | { available: true }
  | { available: false; reason: string; tone: 'paused' | 'scheduled' | 'ended' | 'soldout' };

function availability(t: TicketTypeView): Availability {
  if (t.isPaused) return { available: false, reason: 'Sales paused', tone: 'paused' };
  if (t.salesStartAt) {
    const start = new Date(t.salesStartAt);
    if (!Number.isNaN(start.getTime()) && start > new Date()) {
      const when = start.toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      return { available: false, reason: `Sales open ${when}`, tone: 'scheduled' };
    }
  }
  if (t.salesEndAt) {
    const end = new Date(t.salesEndAt);
    if (!Number.isNaN(end.getTime()) && end < new Date()) {
      return { available: false, reason: 'Sales ended', tone: 'ended' };
    }
  }
  if (t.remaining <= 0) return { available: false, reason: 'Sold out', tone: 'soldout' };
  return { available: true };
}

type CommissionRuleView = {
  percentageBps: number;
  perTicketFee: string;          // BigInt → string for client serialisation
  feeMode: 'PASSED_TO_BUYER' | 'ABSORBED_BY_ORGANISER';
  freeEventsZeroFee: boolean;
};

export function CheckoutForm({
  ticketTypes,
  cheapestFormatted,
  commissionRule,
}: {
  ticketTypes: TicketTypeView[];
  cheapestFormatted: string | null;
  commissionRule: CommissionRuleView | null;
}) {
  // Pick the first ticket type that's actually buyable right now.
  // Falls back to the first one in the list so the UI doesn't go
  // empty when everything's paused/sold out — the disabled state
  // still renders so users can see what was on offer.
  const firstAvailable =
    ticketTypes.find((t) => availability(t).available) ?? ticketTypes[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  const selected = ticketTypes.find((t) => t.id === selectedId);

  const feeBreakdown = useMemo(() => {
    if (!selected) return null;
    const face = Money.fromMinor(BigInt(selected.priceFaceValue), selected.currency);
    const subtotal = face.multiplyByQuantity(quantity);

    // Use the actual rule that applies to this event — this is what the
    // server will charge. Falls back to platform default if no rule passed
    // (shouldn't happen at runtime).
    const pctBps = commissionRule?.percentageBps ?? 500;
    const perTicketMinor = BigInt(commissionRule?.perTicketFee ?? '50');
    const feeMode = commissionRule?.feeMode ?? 'PASSED_TO_BUYER';
    const zeroForFree = commissionRule?.freeEventsZeroFee ?? true;

    let fee: Money;
    if (zeroForFree && face.isZero()) {
      fee = Money.fromMinor(0n, selected.currency);
    } else {
      const pct = subtotal.multiplyByBps(pctBps);
      const fixed = Money.fromMinor(perTicketMinor, selected.currency).multiplyByQuantity(quantity);
      fee = pct.add(fixed);
    }

    const total = feeMode === 'PASSED_TO_BUYER' ? subtotal.add(fee) : subtotal;
    return {
      subtotal: subtotal.format(),
      fee: fee.format(),
      total: total.format(),
      feeMode,
      hasFee: !fee.isZero() && feeMode === 'PASSED_TO_BUYER',
    };
  }, [selected, quantity, commissionRule]);

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createCheckoutSession(formData);
      } catch (err) {
        // `redirect()` throws a special error that Next re-throws; only real
        // errors reach us here.
        const msg = err instanceof Error ? err.message : 'Checkout failed.';
        if (!/NEXT_REDIRECT/.test(msg)) toast.error(msg);
      }
    });
  }

  if (!selected) {
    return (
      <div className="text-sm text-muted-foreground">No ticket types available yet.</div>
    );
  }

  const max = Math.min(selected.maxPerOrder, Math.max(selected.remaining, 1));
  const selectedAvail = availability(selected);
  const canBuy = selectedAvail.available && !isPending;

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Tickets</h2>
        {cheapestFormatted && !selected && (
          <p className="text-sm text-muted-foreground">from {cheapestFormatted}</p>
        )}
      </div>

      <RadioGroup
        value={selectedId}
        onValueChange={(v) => {
          setSelectedId(v);
          setQuantity(1);
        }}
        aria-label="Ticket type"
        className="gap-2"
      >
        {ticketTypes.map((tt) => {
          const price = Money.fromMinor(BigInt(tt.priceFaceValue), tt.currency);
          const avail = availability(tt);
          const lowStock = avail.available && tt.remaining < 10;
          const disabled = !avail.available;
          return (
            <label
              key={tt.id}
              htmlFor={`tt-${tt.id}`}
              className={[
                'flex cursor-pointer items-start justify-between gap-3 border-2 p-4 transition-colors',
                selectedId === tt.id && !disabled
                  ? 'border-primary bg-primary/10'
                  : 'border-outline-variant hover:bg-surface-container-high',
                disabled && 'cursor-not-allowed opacity-60',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem id={`tt-${tt.id}`} value={tt.id} disabled={disabled} className="mt-0.5" />
                <div>
                  <div className="font-medium">{tt.name}</div>
                  {!avail.available ? (
                    <div
                      className={
                        avail.tone === 'paused' || avail.tone === 'ended'
                          ? 'text-xs text-warning'
                          : avail.tone === 'soldout'
                          ? 'text-xs text-muted-foreground'
                          : 'text-xs text-tertiary'
                      }
                    >
                      {avail.reason}
                    </div>
                  ) : lowStock ? (
                    <div className="text-xs text-warning">Only {tt.remaining} left</div>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold">{price.format()}</div>
            </label>
          );
        })}
      </RadioGroup>

      <div role="group" aria-labelledby="qty-label">
        {/* role=group + aria-labelledby because <label htmlFor=qty> only
            associates with form controls; a <div> isn't one. SR users
            now hear "Quantity, group, 1, decrease quantity button…". */}
        <span id="qty-label" className="text-sm font-medium leading-none">Quantity</span>
        <div className="mt-1 inline-flex items-center rounded-lg border border-input">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setQuantity((q) => Math.max(selected.minPerOrder, q - 1))}
            disabled={quantity <= selected.minPerOrder}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div
            aria-live="polite"
            aria-atomic="true"
            className="min-w-[3rem] text-center text-base font-medium"
          >
            {quantity}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            disabled={quantity >= max}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="buyerName">Name on booking</Label>
          <Input
            id="buyerName"
            name="buyerName"
            type="text"
            autoComplete="name"
            required
            minLength={2}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="buyerEmail">Email address</Label>
          <Input
            id="buyerEmail"
            name="buyerEmail"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-describedby="email-help"
          />
          <p id="email-help" className="text-xs text-muted-foreground">
            Your tickets land here within seconds.
          </p>
        </div>
      </div>

      {feeBreakdown && (
        <div className="border-2 border-outline-variant bg-surface-container-low p-3 text-sm">
          <dl className="flex flex-col gap-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{quantity} × ticket</dt>
              <dd>{feeBreakdown.subtotal}</dd>
            </div>
            {feeBreakdown.hasFee && (
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  Booking fee
                  <Info className="h-3 w-3" aria-hidden="true" />
                </dt>
                <dd>{feeBreakdown.fee}</dd>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-outline-variant pt-1 font-semibold">
              <dt>Total</dt>
              <dd>{feeBreakdown.total}</dd>
            </div>
          </dl>
        </div>
      )}

      <input type="hidden" name="ticketTypeId" value={selectedId} />
      <input type="hidden" name="quantity" value={quantity} />

      <Button type="submit" size="lg" disabled={!canBuy}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Securing your tickets…
          </>
        ) : !selectedAvail.available ? (
          selectedAvail.reason
        ) : feeBreakdown ? (
          `Pay ${feeBreakdown.total}`
        ) : (
          'Continue to pay'
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        You&rsquo;ll be redirected to Stripe&rsquo;s secure checkout. No card details touch Droptix.
      </p>
    </form>
  );
}
