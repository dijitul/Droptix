import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Events by city',
  description: 'Browse UK music events by city — Manchester, London, Bristol, Leeds and more.',
};

export const dynamic = 'force-dynamic';

export default async function CitiesPage() {
  // Group events by city via venue. Count upcoming only.
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

  const cities = Array.from(
    rows.reduce((acc, r) => {
      if (!r.city) return acc;
      acc.set(r.city, (acc.get(r.city) ?? 0) + r._count.events);
      return acc;
    }, new Map<string, number>()),
  )
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a);

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
          <p className="text-muted-foreground">No city events live yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map(([city, count]) => (
            <Link
              key={city}
              href={`/uk/${slugify(city)}`}
              className="group flex items-center justify-between border-2 border-outline-variant bg-surface-container p-5 transition-colors hover:border-primary hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-tertiary" aria-hidden="true" />
                  <span className="label-tech text-tertiary">UK · {country(city)}</span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight group-hover:text-primary">
                  {city}
                </h2>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-bold text-primary">{count}</div>
                <div className="label-tech text-muted-foreground">events</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function country(city: string): string {
  // Rough England/Scotland/Wales tag — used on the city card. Keeps SEO copy warm.
  const scotland = ['Glasgow', 'Edinburgh', 'Dundee', 'Aberdeen'];
  const wales = ['Cardiff', 'Swansea', 'Newport'];
  const northern = ['Belfast', 'Derry', 'Londonderry'];
  if (scotland.includes(city)) return 'Scotland';
  if (wales.includes(city)) return 'Wales';
  if (northern.includes(city)) return 'Northern Ireland';
  return 'England';
}
