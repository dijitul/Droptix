import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Mail, Ticket as TicketIcon } from 'lucide-react';
import { db } from '@/server/db';
import { Button } from '@/components/ui/button';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { formatLongDate, formatEventTime } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Booking confirmed', robots: { index: false, follow: false } };

export default async function ConfirmedPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  // Poll briefly — the webhook may trail the success redirect by a few seconds.
  const order = await db.order.findUnique({
    where: { reference },
    include: {
      event: { include: { venue: true, organiser: true } },
      tickets: { select: { id: true, doorCode: true, ticketType: { select: { name: true } } } },
      items: { include: { ticketType: { select: { name: true } } } },
    },
  });

  if (!order) notFound();

  const isPaid = order.status === 'PAID';
  const total = Money.fromMinor(order.totalAmount, order.currency as Currency);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16"
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10"
        role="status"
        aria-label={isPaid ? 'Booking confirmed' : 'Booking processing'}
      >
        <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isPaid ? "You're in." : 'Finalising your booking…'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isPaid
            ? `Booking ${order.reference} is paid. Tickets are on their way to ${order.buyerEmail}.`
            : 'Stripe confirmed your payment — we\'re generating tickets now. Refresh in a few seconds.'}
        </p>
      </div>

      <div className="border-2 border-outline-variant bg-surface-container p-5">
        <h2 className="mb-3 text-lg font-semibold">{order.event.title}</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">When</dt>
            <dd>
              {formatLongDate(order.event.startsAt)} · {formatEventTime(order.event.startsAt)}
            </dd>
          </div>
          {order.event.venue && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Where</dt>
              <dd className="text-right">
                {order.event.venue.name}, {order.event.venue.city}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="font-mono">{order.reference}</dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt>Total paid</dt>
            <dd>{total.format()}</dd>
          </div>
        </dl>
      </div>

      {isPaid && order.tickets.length > 0 && (
        <div className="border-2 border-outline-variant bg-surface-container p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <TicketIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            Your tickets
          </h2>
          <ul className="flex flex-col gap-2">
            {order.tickets.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-2 border-outline-variant p-3">
                <div>
                  <div className="font-medium">{t.ticketType.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{t.doorCode}</div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/tickets/${t.id}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="h-4 w-4" aria-hidden="true" />
        Confirmation email sent to {order.buyerEmail}. Check spam if it&rsquo;s not with you in 2 minutes.
      </p>

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/discover">Browse more events</Link>
        </Button>
      </div>
    </main>
  );
}
