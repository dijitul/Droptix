import Link from 'next/link';
import type { Metadata } from 'next';
import { Search as SearchIcon, MapPin, Shield, Music } from 'lucide-react';
import { db } from '@/server/db';
import { EventCard } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Currency } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search every UK music event, venue, promoter, and city on Droptix.',
  alternates: { canonical: '/search' },
  // Search-result pages should not be indexed (Google's own guidance).
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

type Search = {
  q?: string;
  city?: string;
  venue?: string;
  organiser?: string;
  genre?: string;
};

/**
 * Site-wide search. Single Prisma round-trip per entity type, ranked
 * server-side; filter chips on the side narrow by city/venue/promoter/
 * genre. Result set is capped at 60 events to keep memory + latency
 * predictable on a 2GB VPS — the filters are how users narrow further.
 *
 * SEO: noindex (search-results pages add no canonical content).
 * Crawlable through to the underlying event/venue/org pages.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const cityFilter = (sp.city ?? '').trim();
  const venueFilter = (sp.venue ?? '').trim();
  const organiserFilter = (sp.organiser ?? '').trim();
  const genreFilter = (sp.genre ?? '').trim();

  // Empty-state: show the form + "popular categories" hints, no DB hit.
  if (!q && !cityFilter && !venueFilter && !organiserFilter && !genreFilter) {
    return <EmptyState />;
  }

  // Build the event WHERE clause. Each filter narrows AND-style; the
  // text query OR's across title/subtitle/description.
  const eventWhere = {
    status: { in: ['ON_SALE', 'SCHEDULED', 'SOLD_OUT'] as const },
    publishedAt: { not: null },
    startsAt: { gte: new Date() },
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { subtitle: { contains: q } },
            { description: { contains: q } },
            { organiser: { name: { contains: q } } },
            { venue: { name: { contains: q } } },
            { venue: { city: { contains: q } } },
            { categories: { some: { category: { name: { contains: q } } } } },
          ],
        }
      : {}),
    ...(cityFilter ? { venue: { city: cityFilter } } : {}),
    ...(venueFilter ? { venue: { slug: venueFilter } } : {}),
    ...(organiserFilter ? { organiser: { slug: organiserFilter } } : {}),
    ...(genreFilter
      ? { categories: { some: { category: { slug: genreFilter } } } }
      : {}),
  };

  const [events, venueHits, organiserHits, cityHits, allCities, allGenres] =
    await Promise.all([
      db.event.findMany({
        where: eventWhere,
        orderBy: { startsAt: 'asc' },
        take: 60,
        include: {
          venue: { select: { name: true, city: true, slug: true } },
          organiser: { select: { name: true, slug: true } },
          heroImage: { select: { id: true } },
          ticketTypes: {
            where: { isHidden: false },
            orderBy: { priceFaceValue: 'asc' },
            take: 1,
            select: { priceFaceValue: true, currency: true, capacity: true, soldCount: true },
          },
        },
      }),
      // Side-rail: venues whose name or city matches the query.
      q
        ? db.venue.findMany({
            where: {
              OR: [
                { name: { contains: q } },
                { city: { contains: q } },
              ],
            },
            orderBy: { name: 'asc' },
            take: 6,
            select: { slug: true, name: true, city: true },
          })
        : Promise.resolve([]),
      q
        ? db.organiser.findMany({
            where: {
              status: 'ACTIVE',
              OR: [
                { name: { contains: q } },
                { description: { contains: q } },
              ],
            },
            orderBy: { name: 'asc' },
            take: 6,
            select: { slug: true, name: true, city: true },
          })
        : Promise.resolve([]),
      q
        ? db.city.findMany({
            where: { name: { contains: q } },
            orderBy: { name: 'asc' },
            take: 6,
            select: { slug: true, name: true },
          })
        : Promise.resolve([]),
      // Filter facets: distinct city values used by upcoming events.
      db.venue.findMany({
        where: {
          events: {
            some: {
              status: { in: ['ON_SALE', 'SCHEDULED', 'SOLD_OUT'] },
              startsAt: { gte: new Date() },
              publishedAt: { not: null },
            },
          },
        },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      }),
      db.category.findMany({
        orderBy: { order: 'asc' },
        select: { slug: true, name: true },
      }),
    ]);

  const cityList = Array.from(new Set(allCities.map((v) => v.city))).filter(Boolean).sort();

  // Build a base query string we can append filter params to without
  // dropping the user's text query.
  function filterHref(extra: Partial<Search>): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const merged: Search = {
      city: cityFilter || undefined,
      venue: venueFilter || undefined,
      organiser: organiserFilter || undefined,
      genre: genreFilter || undefined,
      ...extra,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, String(v));
    }
    return `/search?${params.toString()}`;
  }

  function clearHref(key: keyof Search): string {
    return filterHref({ [key]: '' });
  }

  const activeFilters = [
    cityFilter && { key: 'city' as const, label: `City: ${cityFilter}` },
    venueFilter && { key: 'venue' as const, label: `Venue` },
    organiserFilter && { key: 'organiser' as const, label: `Promoter` },
    genreFilter && { key: 'genre' as const, label: `Genre: ${allGenres.find((g) => g.slug === genreFilter)?.name ?? genreFilter}` },
  ].filter(Boolean) as Array<{ key: keyof Search; label: string }>;

  return (
    <main id="main" className="container py-10 sm:py-14">
      <header className="mb-6 max-w-3xl">
        <Badge variant="tech" className="mb-4">Search</Badge>
        <h1 className="text-display-lg uppercase">
          {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Filter results'}
        </h1>
        <p className="mt-3 text-on-surface-variant">
          {events.length === 0
            ? 'Nothing matched. Try a wider query, drop a filter, or browse the hubs below.'
            : `${events.length} event${events.length === 1 ? '' : 's'} found.`}
        </p>
      </header>

      {/* Persistent search form */}
      <form
        role="search"
        action="/search"
        method="GET"
        className="mb-8 flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search events, venues, promoters, cities…"
            className="pl-9"
            aria-label="Search Droptix"
          />
        </div>
        {/* Preserve current filters when re-submitting the text query */}
        {cityFilter && <input type="hidden" name="city" value={cityFilter} />}
        {venueFilter && <input type="hidden" name="venue" value={venueFilter} />}
        {organiserFilter && <input type="hidden" name="organiser" value={organiserFilter} />}
        {genreFilter && <input type="hidden" name="genre" value={genreFilter} />}
        <Button type="submit">Search</Button>
      </form>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="label-tech text-tertiary">Filters:</span>
          {activeFilters.map((f) => (
            <Link
              key={f.key}
              href={clearHref(f.key)}
              className="inline-flex items-center gap-1.5 border-2 border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              aria-label={`Clear filter ${f.label}`}
            >
              {f.label}
              <span aria-hidden="true">×</span>
            </Link>
          ))}
          {(activeFilters.length > 1 || q) && (
            <Link
              href="/search"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
            >
              Clear all
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Results */}
        <div>
          {events.length === 0 ? (
            <div className="border-2 border-dashed border-outline-variant p-10 text-center">
              <p className="text-muted-foreground">
                No events matched. Try{' '}
                <Link href="/discover" className="text-primary underline">all events</Link>
                {', '}
                <Link href="/genres" className="text-primary underline">genres</Link>
                {', or '}
                <Link href="/cities" className="text-primary underline">cities</Link>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((e) => (
                <EventCard
                  key={e.id}
                  slug={e.slug}
                  title={e.title}
                  subtitle={e.subtitle}
                  startsAt={e.startsAt}
                  venue={e.venue}
                  organiser={e.organiser}
                  fromPrice={
                    e.ticketTypes[0]
                      ? {
                          amount: e.ticketTypes[0].priceFaceValue,
                          currency: e.ticketTypes[0].currency as Currency,
                        }
                      : null
                  }
                  soldOut={
                    e.ticketTypes.length > 0 &&
                    e.ticketTypes.every((t) => t.soldCount >= t.capacity)
                  }
                  heroUrl={e.heroImage ? `/api/images/${e.heroImage.id}` : null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Filter sidebar */}
        <aside aria-label="Refine search" className="flex flex-col gap-6">
          {/* City */}
          {cityList.length > 0 && (
            <FilterGroup title="City">
              {cityList.slice(0, 12).map((c) => (
                <FilterLink
                  key={c}
                  href={filterHref({ city: c === cityFilter ? '' : c })}
                  active={c === cityFilter}
                >
                  {c}
                </FilterLink>
              ))}
            </FilterGroup>
          )}

          {/* Genre */}
          {allGenres.length > 0 && (
            <FilterGroup title="Genre">
              {allGenres.map((g) => (
                <FilterLink
                  key={g.slug}
                  href={filterHref({ genre: g.slug === genreFilter ? '' : g.slug })}
                  active={g.slug === genreFilter}
                >
                  {g.name}
                </FilterLink>
              ))}
            </FilterGroup>
          )}

          {/* Cross-entity hits — only when there's a text query */}
          {(venueHits.length > 0 || organiserHits.length > 0 || cityHits.length > 0) && (
            <div className="border-2 border-outline-variant bg-surface-container p-4">
              <div className="label-tech mb-3 text-tertiary">Also matched</div>
              <ul className="flex flex-col gap-3 text-sm">
                {venueHits.map((v) => (
                  <li key={`v-${v.slug}`}>
                    <Link href={`/venues/${v.slug}`} className="flex items-start gap-2 hover:text-primary">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden="true" />
                      <span>
                        <span className="font-medium">{v.name}</span>
                        <span className="block text-xs text-muted-foreground">{v.city} · venue</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {organiserHits.map((o) => (
                  <li key={`o-${o.slug}`}>
                    <Link href={`/organisers/${o.slug}`} className="flex items-start gap-2 hover:text-primary">
                      <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden="true" />
                      <span>
                        <span className="font-medium">{o.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {o.city ? `${o.city} · ` : ''}promoter
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {cityHits.map((c) => (
                  <li key={`c-${c.slug}`}>
                    <Link href={`/uk/${c.slug}`} className="flex items-start gap-2 hover:text-primary">
                      <Music className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden="true" />
                      <span>
                        <span className="font-medium">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">city</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <main id="main" className="container py-16">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <Badge variant="tech" className="mb-4">Search</Badge>
        <h1 className="text-display-lg uppercase">Find a gig</h1>
        <p className="mt-3 text-on-surface-variant">
          Search by event name, artist, venue, promoter or city. UK-wide, music-only.
        </p>
      </header>
      <form
        role="search"
        action="/search"
        method="GET"
        className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            placeholder="Search events, venues, promoters, cities…"
            className="pl-9"
            aria-label="Search Droptix"
            autoFocus
          />
        </div>
        <Button type="submit">Search</Button>
      </form>
      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        <BrowseCard href="/discover" title="All events" />
        <BrowseCard href="/genres" title="By genre" />
        <BrowseCard href="/cities" title="By city" />
        <BrowseCard href="/venues" title="By venue" />
      </div>
    </main>
  );
}

function BrowseCard({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="border-2 border-outline-variant bg-surface-container p-5 text-center font-display text-sm font-bold uppercase tracking-tight transition-colors hover:border-primary hover:text-primary"
    >
      {title}
    </Link>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-outline-variant bg-surface-container p-4">
      <div className="label-tech mb-3 text-tertiary">{title}</div>
      <ul className="flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={
          active
            ? 'inline-flex items-center border-2 border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary'
            : 'inline-flex items-center border-2 border-outline-variant bg-surface-container-low px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary'
        }
      >
        {children}
      </Link>
    </li>
  );
}
