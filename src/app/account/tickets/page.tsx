import Link from 'next/link';
import { requireUser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatEventDateTime } from '@/lib/format';
import { Ticket as TicketIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My tickets' };

export default async function MyTicketsPage() {
  const user = await requireUser();

  // Tickets are either assigned to the user by user-ID (transferred in)
  // or matched via the purchase email. We union both.
  const tickets = await db.ticket.findMany({
    where: {
      OR: [{ holderUserId: user.id }, { holderEmail: user.email ?? '' }],
    },
    include: {
      event: { include: { venue: { select: { name: true, city: true } } } },
      ticketType: { select: { name: true } },
    },
    orderBy: [{ event: { startsAt: 'asc' } }],
  });

  const upcoming = tickets.filter((t) => t.event.startsAt >= new Date());
  const past = tickets.filter((t) => t.event.startsAt < new Date());

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">My tickets</h1>
        <p className="text-muted-foreground">Everything you&rsquo;ve booked through Droptix.</p>
      </header>

      {tickets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          <Section label="Upcoming" items={upcoming} />
          {past.length > 0 && <Section label="Past events" items={past} muted />}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <TicketIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-muted-foreground">You haven&rsquo;t booked anything yet.</p>
      <Button asChild className="mt-4">
        <Link href="/discover">Find an event</Link>
      </Button>
    </div>
  );
}

type TicketRow = {
  id: string;
  doorCode: string;
  status: string;
  event: {
    title: string;
    slug: string;
    startsAt: Date;
    venue: { name: string; city: string } | null;
  };
  ticketType: { name: string };
};

function Section({ label, items, muted }: { label: string; items: TicketRow[]; muted?: boolean }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wider ${muted ? 'text-muted-foreground' : ''}`}>
        {label}
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((t) => (
          <li
            key={t.id}
            className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 ${muted ? 'opacity-70' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{t.event.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatEventDateTime(t.event.startsAt)}
                {t.event.venue && ` · ${t.event.venue.name}, ${t.event.venue.city}`}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline">{t.ticketType.name}</Badge>
                {t.status === 'SCANNED' && <Badge variant="success">Attended</Badge>}
                {t.status === 'VOIDED' && <Badge variant="destructive">Voided</Badge>}
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/tickets/${t.id}`}>View</Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
