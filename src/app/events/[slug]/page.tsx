import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, Clock, Calendar as CalendarIcon, Shield } from 'lucide-react';
import { db } from '@/server/db';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Money } from '@/lib/money';
import { formatLongDate, formatEventTime, toIsoLondon } from '@/lib/format';
import { eventJsonLd, jsonLdScript, breadcrumbsJsonLd } from '@/lib/seo';
import { env } from '@/lib/env';
import type { Currency } from '@prisma/client';
import { CheckoutForm } from './CheckoutForm';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

async function loadEvent(slug: string) {
  return db.event.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: {
      organiser: { select: { id: true, name: true, slug: true, websiteUrl: true } },
      venue: true,
      categories: { include: { category: { select: { name: true, slug: true } } } },
      ticketTypes: {
        where: { isHidden: false },
        orderBy: { position: 'asc' },
      },
      heroImage: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) return {};
  // Use `absolute` to bypass the root layout's `· Droptix` template —
  // event.metaTitle (set at create time) already includes the suffix,
  // so without `absolute` we'd get "Title · Droptix · Droptix".
  return {
    title: { absolute: event.metaTitle ?? `${event.title} · Droptix` },
    description: event.metaDescription ?? event.subtitle ?? event.description.slice(0, 160),
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: event.title,
      description: event.subtitle ?? event.description.slice(0, 160),
      type: 'article',
    },
  };
}

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  const cheapest = event.ticketTypes[0];
  const allSoldOut =
    event.ticketTypes.length > 0 && event.ticketTypes.every((t) => t.soldCount >= t.capacity);

  // Resolve the commission rule that ACTUALLY applies to this event so
  // the buyer's fee preview matches what Stripe will charge. Per-organiser
  // override wins; falls back to the platform default.
  const feeRule =
    (await db.commissionRule.findFirst({
      where: {
        organiserId: event.organiserId,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    })) ??
    (await db.commissionRule.findFirst({
      where: { organiserId: null, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    }));

  const jsonLd = eventJsonLd(event, env.NEXT_PUBLIC_APP_URL);
  const breadcrumbs = breadcrumbsJsonLd([
    { name: 'Home', url: env.NEXT_PUBLIC_APP_URL },
    { name: 'Events', url: `${env.NEXT_PUBLIC_APP_URL}/discover` },
    { name: event.title, url: `${env.NEXT_PUBLIC_APP_URL}/events/${event.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }}
      />

      <main id="main" className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        {/* Hero */}
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden border-2 border-outline-variant bg-gradient-to-br from-primary-soft to-primary/10">
          {event.heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/images/${event.heroImage.id}`}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          )}
          {allSoldOut && (
            <div className="absolute right-4 top-4 rounded-full bg-foreground/90 px-4 py-1.5 text-sm font-semibold text-background">
              Sold out
            </div>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_380px]">
          {/* Content */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {event.categories.map(({ category }) => (
                  <Badge key={category.slug} variant="soft">
                    {category.name}
                  </Badge>
                ))}
                {event.ageRating !== 'ALL' && (
                  <Badge variant="outline">{event.ageRating.replace('AGE_', '').replace('_PLUS', '+')}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {event.title}
              </h1>
              {event.subtitle && (
                <p className="mt-2 text-lg text-muted-foreground">{event.subtitle}</p>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Meta icon={CalendarIcon} label="Date">
                <time dateTime={toIsoLondon(event.startsAt)}>{formatLongDate(event.startsAt)}</time>
              </Meta>
              <Meta icon={Clock} label="Time">
                Doors · {formatEventTime(event.doorsOpenAt ?? event.startsAt)}
              </Meta>
              {event.venue && (
                <Meta icon={MapPin} label="Venue">
                  <div className="leading-snug">
                    {event.venue.slug ? (
                      <Link
                        href={`/venues/${event.venue.slug}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {event.venue.name}
                      </Link>
                    ) : (
                      <div className="font-medium text-foreground">{event.venue.name}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {event.venue.addressLine1}, {event.venue.city} {event.venue.postcode}
                    </div>
                  </div>
                </Meta>
              )}
              <Meta icon={Shield} label="Organiser">
                {event.organiser.slug ? (
                  <Link
                    href={`/organisers/${event.organiser.slug}`}
                    className="text-foreground hover:text-primary hover:underline"
                  >
                    {event.organiser.name}
                  </Link>
                ) : (
                  event.organiser.name
                )}
              </Meta>
            </dl>

            <Separator />

            <div className="prose prose-neutral max-w-none dark:prose-invert">
              <h2 className="text-xl font-semibold">About</h2>
              <p className="whitespace-pre-wrap text-foreground/90">{event.description}</p>
            </div>
          </div>

          {/* Sticky buy panel (desktop) / bottom sheet (mobile) */}
          <aside
            aria-label="Buy tickets"
            className="border-2 border-outline-variant bg-surface-container p-5 md:sticky md:top-24 md:self-start"
          >
            <CheckoutForm
              ticketTypes={event.ticketTypes.map((tt) => ({
                id: tt.id,
                name: tt.name,
                priceFaceValue: tt.priceFaceValue.toString(),
                currency: tt.currency as Currency,
                remaining: tt.capacity - tt.soldCount - tt.reservedCount,
                minPerOrder: tt.minPerOrder,
                maxPerOrder: tt.maxPerOrder,
                // Serialise the sales window + pause flag so the client
                // can compute "is available now" + render disabled-row
                // copy. Server still re-checks at checkout time, this
                // is just the UX guard.
                isPaused: tt.isPaused,
                salesStartAt: tt.salesStartAt?.toISOString() ?? null,
                salesEndAt: tt.salesEndAt?.toISOString() ?? null,
              }))}
              cheapestFormatted={
                cheapest
                  ? Money.fromMinor(cheapest.priceFaceValue, cheapest.currency as Currency).format()
                  : null
              }
              commissionRule={
                feeRule
                  ? {
                      percentageBps: feeRule.percentageBps,
                      perTicketFee: feeRule.perTicketFee.toString(),
                      feeMode: feeRule.feeMode,
                      freeEventsZeroFee: feeRule.freeEventsZeroFee,
                    }
                  : null
              }
            />
          </aside>
        </div>
      </main>
    </>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden={true} />
      </div>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}
