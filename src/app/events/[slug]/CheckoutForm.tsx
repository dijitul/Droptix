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
};

export function CheckoutForm({
  ticketTypes,
  cheapestFormatted,
}: {
  ticketTypes: TicketTypeView[];
  cheapestFormatted: string | null;
}) {
  const firstAvailable = ticketTypes.find((t) => t.remaining > 0) ?? ticketTypes[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  const selected = ticketTypes.find((t) => t.id === selectedId);

  const feeBreakdown = useMemo(() => {
    if (!selected) return null;
    // Client-side *preview only* — server recomputes authoritatively
    const face = Money.fromMinor(BigInt(selected.priceFaceValue), selected.currency);
    const subtotal = face.multiplyByQuantity(quantity);
    // Match server default 5% + £0.50 for preview; correct rule applied server-side
    const pct = subtotal.multiplyByBps(500);
    const fixed = Money.fromMinor(50n, selected.currency).multiplyByQuantity(quantity);
    const fee = pct.add(fixed);
    return {
      subtotal: subtotal.format(),
      fee: fee.format(),
      total: subtotal.add(fee).format(),
    };
  }, [selected, quantity]);

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
  const canBuy = selected.remaining > 0 && !isPending;

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
          const remaining = tt.remaining;
          const soldOut = remaining <= 0;
          const lowStock = !soldOut && remaining < 10;
          return (
            <label
              key={tt.id}
              htmlFor={`tt-${tt.id}`}
              className={[
                'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 transition-colors',
                selectedId === tt.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50',
                soldOut && 'cursor-not-allowed opacity-60',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem id={`tt-${tt.id}`} value={tt.id} disabled={soldOut} className="mt-0.5" />
                <div>
                  <div className="font-medium">{tt.name}</div>
                  {soldOut ? (
                    <div className="text-xs text-muted-foreground">Sold out</div>
                  ) : lowStock ? (
                    <div className="text-xs text-warning">Only {remaining} left</div>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold">{price.format()}</div>
            </label>
          );
        })}
      </RadioGroup>

      <div>
        <Label htmlFor="qty">Quantity</Label>
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
          <div id="qty" aria-live="polite" className="min-w-[3rem] text-center text-base font-medium">
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
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <dl className="flex flex-col gap-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{quantity} × ticket</dt>
              <dd>{feeBreakdown.subtotal}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="flex items-center gap-1 text-muted-foreground">
                Booking fee
                <Info className="h-3 w-3" aria-hidden="true" />
              </dt>
              <dd>{feeBreakdown.fee}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
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
        ) : selected.remaining <= 0 ? (
          'Sold out'
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
