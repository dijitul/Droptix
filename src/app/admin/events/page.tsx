import Link from 'next/link';
import { Search, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/server/guards';
import { db } from '@/server/db';
import { adminSetEventStatus, adminDeleteEvent, adminForceDeleteEvent, adminPurgeEvent } from '@/server/admin';
import { PurgeButton } from '@/components/admin-confirm-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatEventDate } from '@/lib/format';
import { Money } from '@/lib/money';
import type { Currency, EventStatus } from '@prisma/client';

export const metadata = { title: 'All events' };
export const dynamic = 'force-dynamic';

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const caller = await requireAdmin();
  const canForce = caller.role === 'SUPERADMIN';
  const { q, status } = await searchParams;

  const events = await db.event.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { organiser: { name: { contains: q } } },
              { venue: { name: { contains: q } } },
            ],
          }
        : {}),
      ...(status && status !== 'all' ? { status: status as EventStatus } : {}),
    },
    orderBy: { startsAt: 'desc' },
    take: 200,
    include: {
      organiser: { select: { id: true, name: true, slug: true } },
      venue: { select: { name: true, city: true } },
      ticketTypes: {
        select: { priceFaceValue: true, currency: true, capacity: true, soldCount: true },
      },
      _count: { select: { orders: { where: { status: 'PAID' } } } },
    },
  });

  const statusCounts = await db.event.groupBy({
    by: ['status'],
    _count: true,
  });
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Partial<Record<EventStatus, number>>;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Catalogue · platform-wide</div>
        <h1 className="text-display-md uppercase">All events</h1>
      </header>

      {/* Filter bar */}
      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" aria-hidden="true" />
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search title, organiser, venue…"
            className="pl-9"
            aria-label="Search events"
          />
        </div>
        <div>
          <select
            name="status"
            defaultValue={status ?? 'all'}
            className="flex h-11 min-w-[200px] border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="DRAFT">Draft ({counts.DRAFT ?? 0})</option>
            <option value="SCHEDULED">Scheduled ({counts.SCHEDULED ?? 0})</option>
            <option value="ON_SALE">On sale ({counts.ON_SALE ?? 0})</option>
            <option value="SOLD_OUT">Sold out ({counts.SOLD_OUT ?? 0})</option>
            <option value="POSTPONED">Postponed ({counts.POSTPONED ?? 0})</option>
            <option value="RESCHEDULED">Rescheduled ({counts.RESCHEDULED ?? 0})</option>
            <option value="CANCELLED">Cancelled ({counts.CANCELLED ?? 0})</option>
            <option value="COMPLETED">Completed ({counts.COMPLETED ?? 0})</option>
          </select>
        </div>
        <Button type="submit" variant="outline">Apply</Button>
      </form>

      <div className="border-2 border-outline-variant bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-high text-left">
              <Th>Event</Th>
              <Th className="hidden md:table-cell">Organiser</Th>
              <Th className="hidden md:table-cell">Date</Th>
              <Th>Status</Th>
              <Th className="hidden lg:table-cell">Sold</Th>
              <Th className="hidden xl:table-cell">Gross</Th>
              <Th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  {q || status ? 'No events match that filter.' : 'No events yet.'}
                </td>
              </tr>
            ) : (
              events.map((e) => {
                const sold = e.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
                const cap = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
                const grossMinor = e.ticketTypes.reduce(
                  (s, t) => s + BigInt(t.soldCount) * t.priceFaceValue,
                  0n,
                );
                const cheapest = e.ticketTypes[0];
                const ccy = (cheapest?.currency ?? 'GBP') as Currency;
                const canDelete = sold === 0 && e._count.orders === 0;

                return (
                  <tr key={e.id} className="border-b border-outline-variant/60 last:border-b-0">
                    <Td>
                      <Link
                        href={`/organiser/events/${e.id}/edit`}
                        className="font-medium hover:text-primary"
                      >
                        {e.title}
                      </Link>
                      {e.venue && (
                        <div className="label-tech text-muted-foreground">
                          {e.venue.name}, {e.venue.city}
                        </div>
                      )}
                    </Td>
                    <Td className="hidden md:table-cell">
                      <Link
                        href={`/organisers/${e.organiser.slug}`}
                        target="_blank"
                        className="hover:text-primary"
                      >
                        {e.organiser.name}
                      </Link>
                    </Td>
                    <Td className="hidden md:table-cell whitespace-nowrap">
                      {formatEventDate(e.startsAt)}
                    </Td>
                    <Td><StatusBadge status={e.status} /></Td>
                    <Td className="hidden lg:table-cell">
                      {sold} / {cap || '∞'}
                    </Td>
                    <Td className="hidden xl:table-cell">
                      {Money.fromMinor(grossMinor, ccy).format()}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/events/${e.slug}`} target="_blank" aria-label={`View ${e.title} public page`}>
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/organiser/events/${e.id}/edit`}>Edit</Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/organiser/events/${e.id}/attendees`}>Attendees</Link>
                        </Button>
                        {e.status !== 'CANCELLED' && e.status !== 'COMPLETED' && (
                          <form action={adminSetEventStatus.bind(null, e.id, 'CANCELLED')}>
                            <Button type="submit" size="sm" variant="outline">
                              Cancel
                            </Button>
                          </form>
                        )}
                        {e.status === 'CANCELLED' && (
                          <form action={adminSetEventStatus.bind(null, e.id, 'SCHEDULED')}>
                            <Button type="submit" size="sm" variant="outline">
                              Reinstate
                            </Button>
                          </form>
                        )}
                        {canDelete ? (
                          <form action={adminDeleteEvent.bind(null, e.id)}>
                            <Button
                              type="submit"
                              size="sm"
                              variant="destructive"
                              aria-label={`Delete ${e.title}`}
                            >
                              Delete
                            </Button>
                          </form>
                        ) : canForce ? (
                          e._count.orders === 0 && sold === 0 ? (
                            <form action={adminForceDeleteEvent.bind(null, e.id)}>
                              <Button
                                type="submit"
                                size="sm"
                                variant="destructive"
                                aria-label={`Force delete ${e.title}`}
                                title="Cascades through unpaid orders, test scans, and reservations. Refuses if any tickets are PAID."
                              >
                                Force delete
                              </Button>
                            </form>
                          ) : (
                            <PurgeButton
                              action={adminPurgeEvent}
                              id={e.id}
                              slug={e.slug}
                              label="Purge"
                              warning={`PURGE ${e.title} — this destroys ${sold} sold ticket(s), ${e._count.orders} PAID order(s), and every scan + refund. Use ONLY for test data. NOT recoverable.`}
                            />
                          )
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {events.length >= 200 && (
        <p className="label-tech text-muted-foreground">
          Showing first 200 — refine the filter to narrow down.
        </p>
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
