import type { Event, Organiser, Venue, TicketType, Currency } from '@prisma/client';
import { Money } from './money';
import { toIsoLondon } from './format';

/**
 * JSON-LD builders for schema.org Event, following Google's
 * "Events experience on Search" requirements. Omitting required fields
 * disqualifies the event from rich results, so defaults lean strict.
 */

type EventForLd = Event & {
  organiser: Pick<Organiser, 'name' | 'slug' | 'websiteUrl'>;
  venue: Pick<Venue, 'name' | 'addressLine1' | 'addressLine2' | 'city' | 'postcode' | 'country'> | null;
  ticketTypes: Pick<TicketType, 'name' | 'priceFaceValue' | 'currency' | 'capacity' | 'soldCount'>[];
};

const EVENT_STATUS_MAP: Record<Event['status'], string> = {
  DRAFT: 'https://schema.org/EventScheduled',
  SCHEDULED: 'https://schema.org/EventScheduled',
  ON_SALE: 'https://schema.org/EventScheduled',
  SOLD_OUT: 'https://schema.org/EventScheduled',
  POSTPONED: 'https://schema.org/EventPostponed',
  RESCHEDULED: 'https://schema.org/EventRescheduled',
  CANCELLED: 'https://schema.org/EventCancelled',
  COMPLETED: 'https://schema.org/EventScheduled',
};

export function eventJsonLd(event: EventForLd, appUrl: string) {
  const offers = event.ticketTypes.map((tt) => {
    const remaining = tt.capacity - tt.soldCount;
    const availability =
      remaining <= 0
        ? 'https://schema.org/SoldOut'
        : remaining < tt.capacity * 0.2
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/InStock';
    return {
      '@type': 'Offer',
      name: tt.name,
      price: Money.fromMinor(tt.priceFaceValue, tt.currency as Currency).toMajorString(),
      priceCurrency: tt.currency,
      availability,
      url: `${appUrl}/events/${event.slug}`,
      validFrom: toIsoLondon(event.createdAt),
    };
  });

  const location = event.venue
    ? {
        '@type': 'Place',
        name: event.venue.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: [event.venue.addressLine1, event.venue.addressLine2].filter(Boolean).join(', '),
          addressLocality: event.venue.city,
          postalCode: event.venue.postcode,
          addressCountry: event.venue.country,
        },
      }
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description.slice(0, 500),
    startDate: toIsoLondon(event.startsAt),
    endDate: toIsoLondon(event.endsAt),
    eventStatus: EVENT_STATUS_MAP[event.status],
    eventAttendanceMode:
      event.attendanceMode === 'ONLINE'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : event.attendanceMode === 'MIXED'
        ? 'https://schema.org/MixedEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
    location,
    organizer: {
      '@type': 'Organization',
      name: event.organiser.name,
      url: event.organiser.websiteUrl ?? `${appUrl}/organisers/${event.organiser.slug}`,
    },
    offers,
    url: `${appUrl}/events/${event.slug}`,
  };
}

export function breadcrumbsJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Tiny helper to JSON-stringify safely for a <script> tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
