import Link from 'next/link';
import { Calendar, Shield } from 'lucide-react';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Browse organisers',
  description:
    'Every promoter and organiser on Droptix. Follow your favourite crews, find their next event, and never miss a show.',
  alternates: { canonical: '/organisers' },
};

export const dynamic = 'force-dynamic';

export default async function OrganisersIndexPage() {
  // Public-listable organisers only — drafts/disabled excluded.
  // Sort by upcoming-event count so active crews surface first.
  const organisers = await db.organiser.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ name: 'asc' }],
    include: {
      _count: {
        select: {
          events: {
            where: {
              status: { in: ['ON_SALE', 'SCHEDULED', 'SOLD_OUT'] },
              publishedAt: { not: null },
              startsAt: { gte: new Date() },
            },
          },
        },
      },
    },
  });

  const sorted = [...organisers].sort((a, b) => {
    if (b._count.events !== a._count.events) return b._count.events - a._count.events;
    return a.name.localeCompare(b.name);
  });

  return (
    <main id="main" className="container py-12 sm:py-16">
      <header className="mb-12 max-w-3xl">
        <Badge variant="tech" className="mb-4">Organisers</Badge>
        <h1 className="text-display-lg uppercase">Browse by organiser</h1>
        <p className="mt-4 text-lg text-on-surface-variant">
          Every promoter, collective and venue running shows on Droptix. Find
          your favourite crews and follow what they&rsquo;re putting on next.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center">
          <p className="text-muted-foreground">
            No organisers live yet.{' '}
            <Link href="/sell" className="text-primary underline">Become one</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((o) => (
            <Link
              key={o.slug}
              href={`/organisers/${o.slug}`}
              className="group flex items-start justify-between gap-3 border-2 border-outline-variant bg-surface-container p-5 transition-colors hover:border-primary hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-tertiary" aria-hidden="true" />
                  <span className="label-tech text-tertiary">Promoter</span>
                </div>
                <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-tight group-hover:text-primary">
                  {o.name}
                </h2>
                {o.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{o.description}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span className="font-display text-2xl font-bold text-primary">
                    {o._count.events}
                  </span>
                </div>
                <div className="label-tech text-muted-foreground">
                  {o._count.events === 1 ? 'event' : 'events'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
