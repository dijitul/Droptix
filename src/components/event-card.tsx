import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Currency } from '@prisma/client';
import { Money } from '@/lib/money';
import { formatEventDate, formatEventTime, toIsoLondon } from '@/lib/format';

type EventCardProps = {
  slug: string;
  title: string;
  subtitle?: string | null;
  startsAt: Date;
  venue: { name: string; city: string } | null;
  organiser: { name: string };
  fromPrice: { amount: bigint; currency: Currency } | null;
  soldOut?: boolean;
  heroUrl?: string | null;
};

export function EventCard({
  slug,
  title,
  subtitle,
  startsAt,
  venue,
  organiser,
  fromPrice,
  soldOut,
  heroUrl,
}: EventCardProps) {
  const price = fromPrice ? Money.fromMinor(fromPrice.amount, fromPrice.currency) : null;
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
  }).format(startsAt);
  const month = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    month: 'short',
  })
    .format(startsAt)
    .toUpperCase();

  return (
    <Link
      href={`/events/${slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`${title} at ${venue?.name ?? 'venue TBA'}, ${formatEventDate(startsAt)}`}
    >
      <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-primary-soft to-primary/20">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-6xl font-black text-primary/30">
            {title.charAt(0)}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col items-center justify-center rounded-lg bg-background/95 px-3 py-2 text-center shadow-sm backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</span>
          <span className="text-xl font-bold leading-none">{day}</span>
        </div>
        {soldOut && (
          <div className="absolute right-3 top-3 rounded-full bg-foreground/90 px-3 py-1 text-xs font-semibold text-background">
            Sold out
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-tight">{title}</h3>
        {subtitle && <p className="line-clamp-1 text-sm text-muted-foreground">{subtitle}</p>}
        {venue && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            <span className="truncate">
              {venue.name}, {venue.city}
            </span>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="truncate text-xs text-muted-foreground">{organiser.name}</span>
          {price && (
            <span className="shrink-0 text-sm font-semibold">
              from {price.format()}
            </span>
          )}
        </div>
      </div>
      <time dateTime={toIsoLondon(startsAt)} className="sr-only">
        {formatEventDate(startsAt)} at {formatEventTime(startsAt)}
      </time>
    </Link>
  );
}
