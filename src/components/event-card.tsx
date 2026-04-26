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
  venue: { name: string; city: string; slug?: string } | null;
  organiser: { name: string; slug?: string };
  fromPrice: { amount: bigint; currency: Currency } | null;
  soldOut?: boolean;
  heroUrl?: string | null;
};

/**
 * Event card — industrial poster aesthetic. Portrait hero, date chit
 * in the top-left, title slabbed in Space Grotesk, small tech labels
 * everywhere. Hover raises a lime border and shifts the image up.
 *
 * The card itself is a `<Link>` to the event page, but organiser + venue
 * names are rendered as nested links inside it. We intentionally use a
 * `<div>` outer wrapper plus an absolutely-positioned card-cover link so
 * inner links remain individually tappable (clickable nested anchors are
 * invalid HTML; this is the standard "card pattern" workaround).
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

  const venueHref = venue?.slug ? `/venues/${venue.slug}` : null;
  const organiserHref = organiser.slug ? `/organisers/${organiser.slug}` : null;

  return (
    <div className="group relative flex flex-col overflow-hidden border-2 border-outline-variant bg-surface-container transition-colors hover:border-primary focus-within:border-primary">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-dim">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
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

        <div className="absolute inset-0 bg-gradient-to-t from-surface/95 via-surface/40 to-transparent" aria-hidden="true" />

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

      <div className="relative flex flex-1 flex-col gap-1 border-t-2 border-outline-variant bg-surface-container p-4">
        {/* Card-cover link: makes the body clickable, but nested links inside
            the body still work because they have higher z-index. */}
        <Link
          href={`/events/${slug}`}
          aria-label={`${title} at ${venue?.name ?? 'venue TBA'}, ${formatEventDate(startsAt)}`}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />

        <h3 className="relative z-[1] line-clamp-2 font-display text-lg font-bold leading-tight tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="relative z-[1] line-clamp-1 text-sm text-muted-foreground">{subtitle}</p>
        )}

        {venue && (
          <p className="relative z-[1] mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-tertiary" aria-hidden="true" />
            {venueHref ? (
              <Link
                href={venueHref}
                className="relative z-[2] truncate hover:text-primary hover:underline"
              >
                {venue.name}, {venue.city}
              </Link>
            ) : (
              <span className="truncate">
                {venue.name}, {venue.city}
              </span>
            )}
          </p>
        )}

        <div className="relative z-[1] mt-auto flex items-center justify-between border-t border-outline-variant/50 pt-3">
          {organiserHref ? (
            <Link
              href={organiserHref}
              className="relative z-[2] label-tech truncate text-muted-foreground hover:text-primary hover:underline"
            >
              {organiser.name}
            </Link>
          ) : (
            <span className="label-tech truncate text-muted-foreground">{organiser.name}</span>
          )}
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
    </div>
  );
}
