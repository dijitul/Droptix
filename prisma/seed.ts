import { PrismaClient } from '@prisma/client';
import { generateEventSigningKey, generateDoorCode } from '../src/lib/ticket-signing';
import { randomBytes } from 'node:crypto';

const db = new PrismaClient();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  // ── Platform default commission ─────────────────────────────
  await db.commissionRule.upsert({
    where: { id: 'platform-default' },
    create: {
      id: 'platform-default',
      organiserId: null,
      percentageBps: 500,
      perTicketFee: 50n,
      currency: 'GBP',
      feeMode: 'PASSED_TO_BUYER',
      freeEventsZeroFee: true,
      note: 'Platform default — 5% + £0.50 passed to buyer',
    },
    update: {},
  });

  // ── Categories ──────────────────────────────────────────────
  const categories = [
    { slug: 'club-nights', name: 'Club nights', order: 1 },
    { slug: 'gigs', name: 'Gigs', order: 2 },
    { slug: 'comedy', name: 'Comedy', order: 3 },
    { slug: 'festivals', name: 'Festivals', order: 4 },
    { slug: 'theatre', name: 'Theatre', order: 5 },
    { slug: 'food-drink', name: 'Food & drink', order: 6 },
    { slug: 'community', name: 'Community', order: 7 },
    { slug: 'workshops', name: 'Workshops', order: 8 },
  ];
  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name, order: c.order } });
  }

  // ── Feature flags ───────────────────────────────────────────
  const flags = [
    { key: 'wallet_passes', description: 'Apple/Google Wallet pass generation', enabled: false },
    { key: 'face_value_resale', description: 'Face-value resale marketplace', enabled: false },
    { key: 'reserved_seating', description: 'Assigned seat maps', enabled: false },
    { key: 'waitlist', description: 'Sold-out event waitlist', enabled: false },
    { key: 'referral_credit', description: 'Buyer-to-buyer referral credit', enabled: false },
    { key: 'refund_protection_upsell', description: 'Booking protection at checkout', enabled: false },
    { key: 'demo_events', description: 'Show seeded demo events on Discover', enabled: true },
  ];
  for (const f of flags) {
    await db.featureFlag.upsert({ where: { key: f.key }, create: f, update: { description: f.description } });
  }

  // ── Demo organiser + venue + events (so / shows something) ──
  const organiser = await db.organiser.upsert({
    where: { slug: 'droptix-presents' },
    create: {
      slug: 'droptix-presents',
      name: 'Droptix Presents',
      email: 'hello@droptix.co.uk',
      city: 'Manchester',
      description: 'Demo organiser for launch — replace with real organisers as they sign up.',
      status: 'ACTIVE',
      verifiedAt: new Date(),
    },
    update: {},
  });

  const venues: Array<{ slug: string; name: string; city: string; postcode: string; addressLine1: string; capacity: number }> = [
    { slug: 'the-white-hotel', name: 'The White Hotel', city: 'Manchester', postcode: 'M3 5EN', addressLine1: 'Dickinson Street', capacity: 400 },
    { slug: 'the-louisiana', name: 'The Louisiana', city: 'Bristol', postcode: 'BS1 6UA', addressLine1: 'Wapping Road', capacity: 140 },
    { slug: 'brudenell-social-club', name: 'Brudenell Social Club', city: 'Leeds', postcode: 'LS6 1LG', addressLine1: '33 Queens Rd', capacity: 450 },
  ];
  for (const v of venues) {
    await db.venue.upsert({ where: { slug: v.slug }, create: v, update: {} });
  }

  const catMap = Object.fromEntries(
    (await db.category.findMany()).map((c) => [c.slug, c.id] as const),
  );
  const venueMap = Object.fromEntries(
    (await db.venue.findMany()).map((v) => [v.slug, v] as const),
  );

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const demoEvents = [
    {
      title: 'Friday Frequencies · Warehouse session',
      subtitle: 'UK garage, 2-step and bassline until 4am',
      slug: 'friday-frequencies-manchester-apr',
      venue: 'the-white-hotel',
      category: 'club-nights',
      startsAt: daysFromNow(14),
      endsAt: daysFromNow(14 + 0.25),
      ageRating: 'AGE_18_PLUS' as const,
      description: 'Our flagship warehouse party returns for a late spring special. Full Funktion-One rig, strobes, no phones on the dancefloor. Support from two residents plus a special guest we can\'t announce until the door.',
      ticketTypes: [
        { name: 'Early bird', faceValue: 800n, capacity: 100 },
        { name: 'General admission', faceValue: 1200n, capacity: 250 },
      ],
    },
    {
      title: 'The Nightshift Comedy Club',
      subtitle: 'Four comics, one compère, weekly chaos',
      slug: 'nightshift-comedy-bristol-may',
      venue: 'the-louisiana',
      category: 'comedy',
      startsAt: daysFromNow(21),
      endsAt: daysFromNow(21 + 0.15),
      ageRating: 'AGE_16_PLUS' as const,
      description: 'Upstairs at The Louisiana. Lineups change weekly but the quality doesn\'t — we\'ve hosted Edinburgh winners and Mock The Week regulars. Under 18s not admitted.',
      ticketTypes: [
        { name: 'Standard', faceValue: 1000n, capacity: 90 },
        { name: 'Front row', faceValue: 1500n, capacity: 16 },
      ],
    },
    {
      title: 'Deadbeat Records showcase',
      subtitle: 'Three bands, label night, cheap pints',
      slug: 'deadbeat-showcase-leeds-may',
      venue: 'brudenell-social-club',
      category: 'gigs',
      startsAt: daysFromNow(30),
      endsAt: daysFromNow(30 + 0.2),
      ageRating: 'AGE_14_PLUS' as const,
      description: 'Deadbeat Records hit the Brudenell with three of the label\'s brightest for an early-summer showcase. Doors 7:30pm. 14+ with adult, unaccompanied 18+.',
      ticketTypes: [
        { name: 'Early bird', faceValue: 800n, capacity: 80 },
        { name: 'Advance', faceValue: 1200n, capacity: 300 },
        { name: 'On the door', faceValue: 1500n, capacity: 50 },
      ],
    },
  ];

  for (const e of demoEvents) {
    const venue = venueMap[e.venue]!;
    await db.event.upsert({
      where: { slug: e.slug },
      create: {
        slug: e.slug,
        organiserId: organiser.id,
        venueId: venue.id,
        title: e.title,
        subtitle: e.subtitle,
        description: e.description,
        status: 'ON_SALE',
        attendanceMode: 'OFFLINE',
        ageRating: e.ageRating,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        timezone: 'Europe/London',
        totalCapacity: e.ticketTypes.reduce((sum, t) => sum + t.capacity, 0),
        currency: 'GBP',
        ticketSigningKey: generateEventSigningKey(),
        publishedAt: new Date(),
        onSaleAt: new Date(),
        metaTitle: `${e.title} — tickets · Droptix`,
        metaDescription: e.subtitle,
        categories: { create: [{ categoryId: catMap[e.category]! }] },
        ticketTypes: {
          create: e.ticketTypes.map((t, i) => ({
            name: t.name,
            priceFaceValue: t.faceValue,
            currency: 'GBP',
            capacity: t.capacity,
            position: i,
            maxPerOrder: 10,
            minPerOrder: 1,
          })),
        },
      },
      update: {},
    });
  }

  console.log('✓ Seeded: 1 organiser, 3 venues, 3 events, 8 categories, 7 flags.');
  void randomBytes; // keep import even if unused by linter
  void generateDoorCode;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
