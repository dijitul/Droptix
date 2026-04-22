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

/**
 * Event card — industrial poster aesthetic. Portrait hero, date chit
 * in the top-left, title slabbed in Space Grotesk, small tech labels
 * everywhere. Hover raises a lime border and shifts the image up.
 */
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
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit' }).format(startsAt);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'short' })
    .format(startsAt)
    .toUpperCase();

  return (
    <Link
      href={`/events/${slug}`}
      className="group relative flex flex-col overflow-hidden border-2 border-outline-variant bg-surface-container transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${title} at ${venue?.name ?? 'venue TBA'}, ${formatEventDate(startsAt)}`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-dim">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-85 transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center font-display text-7xl font-black uppercase text-primary/30"
          >
            {title.charAt(0)}
          </div>
        )}

        {/* Ink gradient for copy legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/95 via-surface/40 to-transparent" aria-hidden="true" />

        {/* Date chit — top left */}
        <div className="absolute left-3 top-3 flex flex-col items-start border border-primary bg-background/90 px-2.5 py-1.5 backdrop-blur">
          <span className="label-tech text-tertiary">{month}</span>
          <span className="font-display text-xl font-bold leading-none text-foreground">{day}</span>
        </div>

        {soldOut && (
          <div className="absolute right-3 top-3 border border-secondary bg-secondary px-2 py-1 label-tech text-secondary-foreground">
            Sold out
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t-2 border-outline-variant bg-surface-container p-4">
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight tracking-tight">{title}</h3>
        {subtitle && <p className="line-clamp-1 text-sm text-muted-foreground">{subtitle}</p>}

        {venue && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 text-tertiary" aria-hidden="true" />
            <span className="truncate">
              {venue.name}, {venue.city}
            </span>
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-outline-variant/50 pt-3">
          <span className="label-tech truncate text-muted-foreground">{organiser.name}</span>
          {price && (
            <span className="shrink-0 font-display text-base font-bold text-primary">
              {price.format()}
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
