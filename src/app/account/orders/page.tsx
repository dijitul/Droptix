import Link from 'next/link';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { formatEventDate } from '@/lib/format';

export const metadata = { title: 'Order history' };
export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await requireUser();

  const orders = await db.order.findMany({
    where: {
      OR: [{ userId: user.id }, { buyerEmail: user.email ?? '' }],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      event: { select: { title: true, slug: true, startsAt: true } },
      _count: { select: { tickets: true } },
    },
  });

  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/account" className="hover:text-primary">Account</Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">Order history</span>
      </nav>

      <header className="mt-6 mb-10">
        <h1 className="text-display-md uppercase">Order history</h1>
        <p className="mt-3 text-on-surface-variant">
          Every booking tied to {user.email}, including cancelled and refunded.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/discover">Find an event</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-4 border-2 border-outline-variant bg-surface-container p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-tertiary">{o.reference}</span>
                  <StatusBadge status={o.status} />
                </div>
                <Link
                  href={`/events/${o.event.slug}`}
                  className="mt-1 block font-medium hover:text-primary"
                >
                  {o.event.title}
                </Link>
                <div className="label-tech mt-1 text-muted-foreground">
                  {formatEventDate(o.event.startsAt)} · {o._count.tickets}{' '}
                  {o._count.tickets === 1 ? 'ticket' : 'tickets'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold text-primary">
                  {Money.fromMinor(o.totalAmount, o.currency as Currency).format()}
                </div>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href={`/orders/${o.reference}/confirmed`}>View</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'success' | 'hazard' | 'outline' | 'destructive' | 'tech'> = {
    PAID: 'success',
    PENDING: 'tech',
    CANCELLED: 'outline',
    REFUNDED: 'destructive',
    PARTIALLY_REFUNDED: 'hazard',
    FAILED: 'destructive',
  };
  return <Badge variant={map[status] ?? 'outline'}>{status.replace('_', ' ')}</Badge>;
}
