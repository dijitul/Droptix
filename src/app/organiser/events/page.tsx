import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatEventDate } from '@/lib/format';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';

export const metadata = { title: 'Events' };
export const dynamic = 'force-dynamic';

export default async function OrganiserEventsPage() {
  const user = await requireOrganiser();
  const membership = await db.organiserMember.findFirstOrThrow({
    where: { userId: user.id },
    select: { organiserId: true },
  });

  const events = await db.event.findMany({
    where: { organiserId: membership.organiserId },
    orderBy: [{ startsAt: 'asc' }],
    include: {
      venue: { select: { name: true, city: true } },
      ticketTypes: { select: { priceFaceValue: true, currency: true, capacity: true, soldCount: true } },
      _count: { select: { orders: { where: { status: 'PAID' } } } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="label-tech mb-2 text-tertiary">Catalogue</div>
          <h1 className="text-display-md uppercase">Events</h1>
        </div>
        <Button asChild>
          <Link href="/organiser/events/new">
            <Plus className="h-4 w-4" aria-hidden="true" /> New event
          </Link>
        </Button>
      </header>

      {events.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-16 text-center">
          <p className="text-muted-foreground">Nothing here yet.</p>
          <Button asChild className="mt-4">
            <Link href="/organiser/events/new">Create your first event</Link>
          </Button>
        </div>
      ) : (
        <div className="border-2 border-outline-variant bg-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high text-left">
                <Th>Event</Th>
                <Th>When</Th>
                <Th className="hidden md:table-cell">Status</Th>
                <Th className="hidden md:table-cell">Sold</Th>
                <Th className="hidden lg:table-cell">Gross</Th>
                <Th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const cap = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
                const sold = e.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
                const grossMinor = e.ticketTypes.reduce(
                  (s, t) => s + BigInt(t.soldCount) * t.priceFaceValue,
                  0n,
                );
                const cheapest = e.ticketTypes[0];
                const ccy = (cheapest?.currency ?? 'GBP') as Currency;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-outline-variant/60 last:border-b-0 hover:bg-surface-container-high"
                  >
                    <Td>
                      <Link href={`/organiser/events/${e.id}/edit`} className="font-medium hover:text-primary">
                        {e.title}
                      </Link>
                      {e.venue && (
                        <div className="label-tech text-muted-foreground">
                          {e.venue.name}, {e.venue.city}
                        </div>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{formatEventDate(e.startsAt)}</Td>
                    <Td className="hidden md:table-cell">
                      <StatusBadge status={e.status} />
                    </Td>
                    <Td className="hidden md:table-cell">
                      {sold} / {cap || '∞'}
                    </Td>
                    <Td className="hidden lg:table-cell">{Money.fromMinor(grossMinor, ccy).format()}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/organiser/events/${e.id}/edit`}>Manage</Link>
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`label-tech px-4 py-3 text-tertiary ${className ?? ''}`} {...rest}>
      {children}
    </th>
  );
}

function Td({ children, className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-top ${className ?? ''}`} {...rest}>
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'success' | 'hazard' | 'outline' | 'tech' | 'destructive'> = {
    DRAFT: 'outline',
    SCHEDULED: 'tech',
    ON_SALE: 'success',
    SOLD_OUT: 'hazard',
    POSTPONED: 'hazard',
    RESCHEDULED: 'hazard',
    CANCELLED: 'destructive',
    COMPLETED: 'outline',
  };
  return <Badge variant={map[status] ?? 'outline'}>{status.replace('_', ' ')}</Badge>;
}
