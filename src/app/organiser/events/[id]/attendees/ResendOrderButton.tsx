'use client';

import { useTransition } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resendOrderConfirmation } from '@/server/orders';
import { toast } from 'sonner';

/**
 * Inline "Resend email" button for the attendees table.
 *
 * Server actions normally throw to the page-level error boundary on
 * failure, which is heavy-handed for "we re-sent your ticket". Wrap
 * the call in useTransition + toast so the user gets feedback in
 * place without losing scroll position or table state.
 */
export function ResendOrderButton({
  orderId,
  reference,
  buyerEmail,
}: {
  orderId: string;
  reference: string;
  buyerEmail: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (isPending) return;
    startTransition(async () => {
      try {
        await resendOrderConfirmation(orderId);
        toast.success(`Re-sent to ${buyerEmail}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to resend.';
        toast.error(msg);
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={isPending}
      aria-label={`Resend order ${reference} confirmation email to ${buyerEmail}`}
      title="Re-send the order confirmation email with ticket links"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="ml-1 hidden sm:inline">Resend email</span>
    </Button>
  );
}
