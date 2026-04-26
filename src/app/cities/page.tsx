import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Events by city',
  description: 'Browse UK music events by city — Manchester, London, Bristol, Leeds and more.',
  alternates: { canonical: '/cities' },
};

export const dynamic = 'force-dynamic';

export default async function CitiesPage() {
  // Prefer canonical City rows (have metadata, SEO copy, featured flag).
  // Fall back to distinct venue.city strings so the hub is never empty
  // during bootstrap before admin seeds cities.
  const canonical = await db.city.findMany({
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          venues: {
            where: {
              events: {
                some: {
                  status: 'ON_SALE',
                  startsAt: { gte: new Date() },
                  publishedAt: { not: null },
                },
              },
            },
          },
        },
      },
    },
  });

  const eventCounts = canonical.length
    ? new Map(canonical.map((c) => [c.name, c._count.venues] as const))
    : new Map<string, number>();

  // Build display list. If admin has curated City rows, use those;
  // otherwise derive from venues so launch is never "no cities shown".
  let cities: Array<{ slug: string; name: string; country: string; count: number }>;
  if (canonical.length) {
    cities = canonical.map((c) => ({
      slug: c.slug,
      name: c.name,
      country: c.country,
      count: eventCounts.get(c.name) ?? 0,
    }));
  } else {
    const rows = await db.venue.findMany({
      select: {
        city: true,
        _count: {
          select: {
            events: {
              where: { status: 'ON_SALE', startsAt: { gte: new Date() }, publishedAt: { not: null } },
            },
          },
        },
      },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.city) continue;
      counts.set(r.city, (counts.get(r.city) ?? 0) + r._count.events);
    }
    cities = Array.from(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        country: 'GB',
        count,
      }));
  }

  return (
    <main id="main" className="container py-12 sm:py-16">
      <header className="mb-12 max-w-3xl">
        <Badge variant="tech" className="mb-4">Cities · UK</Badge>
        <h1 className="text-display-lg uppercase">Find events in your city</h1>
        <p className="mt-4 text-lg text-on-surface-variant">
          Every UK city with a scene worth catching — pick a city to see what&rsquo;s on this month.
        </p>
      </header>

      {cities.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant p-10 text-center">
          <p className="text-muted-foreground">
            No cities curated yet.{' '}
            <Link href="/discover" className="text-primary underline">Browse all events</Link>
            {' '}or{' '}
            <Link href="/sell" className="text-primary underline">run one yourself</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c) => (
            <Link
              key={c.slug}
              href={`/uk/${c.slug}`}
              className="group flex items-center justify-between border-2 border-outline-variant bg-surface-container p-5 transition-colors hover:border-primary hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-tertiary" aria-hidden="true" />
                  <span className="label-tech text-tertiary">UK · {regionFor(c.name)}</span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight group-hover:text-primary">
                  {c.name}
                </h2>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-bold text-primary">{c.count}</div>
                <div className="label-tech text-muted-foreground">
                  {c.count === 1 ? 'event' : 'events'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function regionFor(city: string): string {
  const scotland = ['Glasgow', 'Edinburgh', 'Dundee', 'Aberdeen'];
  const wales = ['Cardiff', 'Swansea', 'Newport'];
  const northern = ['Belfast', 'Derry', 'Londonderry'];
  if (scotland.includes(city)) return 'Scotland';
  if (wales.includes(city)) return 'Wales';
  if (northern.includes(city)) return 'Northern Ireland';
  return 'England';
}
