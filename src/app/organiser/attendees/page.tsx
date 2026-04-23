import Link from 'next/link';
import { Search, Download, Calendar } from 'lucide-react';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatEventDate } from '@/lib/format';

export const metadata = { title: 'All attendees' };
export const dynamic = 'force-dynamic';

export default async function OrganiserAttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireOrganiser();
  const { q } = await searchParams;

  const membership = await db.organiserMember.findFirstOrThrow({
    where: { userId: user.id },
    select: { organiserId: true },
  });
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

  // Aggregate across every event the caller owns (or every event if admin).
  const eventWhere = isAdmin ? {} : { organiserId: membership.organiserId };

  const events = await db.event.findMany({
    where: {
      ...eventWhere,
      ...(q ? { title: { contains: q } } : {}),
    },
    orderBy: { startsAt: 'desc' },
    take: 30,
    include: {
      venue: { select: { name: true, city: true } },
      _count: { select: { tickets: { where: { status: { in: ['ISSUED', 'SCANNED', 'TRANSFERRED'] } } } } },
      ticketTypes: { select: { capacity: true, soldCount: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Across all events</div>
        <h1 className="text-display-md uppercase">Attendees</h1>
        <p className="mt-3 text-on-surface-variant max-w-prose">
          Pick an event to see its door list, search tickets, or export the full CSV. Search names
          across the whole catalogue from here if you can&rsquo;t remember which show they&rsquo;re on.
        </p>
      </header>

      <form className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" aria-hidden="true" />
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Filter by event title…"
            className="pl-9"
            aria-label="Filter events"
          />
        </div>
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      {events.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center text-muted-foreground">
          {q ? 'No events match that filter.' : "You haven't created any events yet."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const cap = e.ticketTypes.reduce((s, t) => s + t.capacity, 0);
            const sold = e.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
            return (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-4 border-2 border-outline-variant bg-surface-container p-5"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <Calendar className="mt-1 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
                  <div className="min-w-0">
                    <Link
                      href={`/organiser/events/${e.id}/edit`}
                      className="font-display text-lg font-bold hover:text-primary"
                    >
                      {e.title}
                    </Link>
                    <div className="label-tech mt-1 text-muted-foreground">
                      {formatEventDate(e.startsAt)}
                      {e.venue ? ` · ${e.venue.name}, ${e.venue.city}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="tech">
                    {e._count.tickets} / {cap || sold} tickets
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/organiser/events/${e.id}/attendees`}>
                      View list
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a
                      href={`/api/organiser/events/${e.id}/attendees.csv`}
                      download
                      aria-label={`Download ${e.title} CSV`}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
