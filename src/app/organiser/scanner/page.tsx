import Link from 'next/link';
import { ArrowRight, QrCode } from 'lucide-react';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { formatEventDate } from '@/lib/format';

export const metadata = { title: 'Door scanner' };
export const dynamic = 'force-dynamic';

export default async function ScannerIndexPage() {
  const user = await requireOrganiser();
  const membership = await db.organiserMember.findFirstOrThrow({
    where: { userId: user.id },
    select: { organiserId: true },
  });

  // Show the next 10 events — door crew scan these.
  const events = await db.event.findMany({
    where: {
      organiserId: membership.organiserId,
      endsAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }, // include ongoing + next 2 weeks
    },
    orderBy: { startsAt: 'asc' },
    take: 10,
    include: {
      venue: { select: { name: true, city: true } },
      _count: { select: { tickets: { where: { status: 'SCANNED' } } } },
      ticketTypes: { select: { soldCount: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="label-tech mb-2 text-tertiary">Door tools</div>
        <h1 className="text-display-md uppercase">Scanner</h1>
        <p className="mt-3 text-on-surface-variant max-w-prose">
          Pick the event you&rsquo;re scanning into. The scanner works offline &mdash; tickets
          verified on the device sync to the server when signal returns.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center text-muted-foreground">
          No upcoming events to scan.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const sold = e.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
            return (
              <li key={e.id}>
                <Link
                  href={`/organiser/scanner/${e.id}`}
                  className="flex items-center justify-between gap-4 border-2 border-outline-variant bg-surface-container p-5 transition-colors hover:border-primary hover:bg-surface-container-high"
                >
                  <div className="flex items-center gap-4">
                    <QrCode className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <div className="font-display text-lg font-bold">{e.title}</div>
                      <div className="label-tech mt-1 text-muted-foreground">
                        {formatEventDate(e.startsAt)}
                        {e.venue ? ` · ${e.venue.name}, ${e.venue.city}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-display text-lg font-bold text-primary">
                        {e._count.tickets}/{sold}
                      </div>
                      <Badge variant="tech">scanned</Badge>
                    </div>
                    <ArrowRight className="h-5 w-5 text-tertiary" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
