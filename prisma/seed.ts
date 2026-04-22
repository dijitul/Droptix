import { PrismaClient } from '@prisma/client';
import { generateEventSigningKey } from '../src/lib/ticket-signing';

const db = new PrismaClient();

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

  // ── Music-only categories ────────────────────────────────────
  // Droptix is a music-events marketplace. No comedy/theatre/community.
  const categories = [
    { slug: 'club-nights', name: 'Club nights', order: 1 },
    { slug: 'gigs', name: 'Live gigs', order: 2 },
    { slug: 'festivals', name: 'Festivals', order: 3 },
    { slug: 'techno', name: 'Techno', order: 10 },
    { slug: 'house', name: 'House', order: 11 },
    { slug: 'drum-and-bass', name: 'Drum & bass', order: 12 },
    { slug: 'garage', name: 'UK garage', order: 13 },
    { slug: 'dubstep', name: 'Dubstep & bass', order: 14 },
    { slug: 'hip-hop', name: 'Hip-hop & R&B', order: 15 },
    { slug: 'rock-indie', name: 'Rock & indie', order: 16 },
    { slug: 'metal', name: 'Metal & hardcore', order: 17 },
    { slug: 'jazz-soul', name: 'Jazz, soul & funk', order: 18 },
    { slug: 'electronic', name: 'Electronic', order: 19 },
    { slug: 'hardcore-rave', name: 'Hardcore & rave', order: 20 },
    { slug: 'singer-songwriter', name: 'Singer-songwriter', order: 21 },
  ];

  // Remove any non-music legacy categories from prior seeds
  await db.category.deleteMany({
    where: {
      slug: { in: ['comedy', 'theatre', 'food-drink', 'community', 'workshops'] },
    },
  });

  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name, order: c.order } });
  }

  // ── Feature flags ────────────────────────────────────────────
  const flags = [
    { key: 'wallet_passes', description: 'Apple/Google Wallet pass generation', enabled: false },
    { key: 'face_value_resale', description: 'Face-value resale marketplace (post CMA 2025)', enabled: false },
    { key: 'reserved_seating', description: 'Assigned seat maps', enabled: false },
    { key: 'waitlist', description: 'Sold-out event waitlist', enabled: false },
    { key: 'referral_credit', description: 'Buyer-to-buyer referral credit', enabled: false },
    { key: 'refund_protection_upsell', description: 'Booking protection at checkout', enabled: false },
    { key: 'demo_events', description: 'Show seeded demo events on Discover', enabled: true },
  ];
  for (const f of flags) {
    await db.featureFlag.upsert({ where: { key: f.key }, create: f, update: { description: f.description } });
  }

  // ── Demo organiser + UK music venues ─────────────────────────
  const organiser = await db.organiser.upsert({
    where: { slug: 'droptix-presents' },
    create: {
      slug: 'droptix-presents',
      name: 'Droptix Presents',
      email: 'hello@droptix.co.uk',
      city: 'Manchester',
      description: 'Demo organiser — replaced with real promoters as they sign up via Stripe Connect.',
      status: 'ACTIVE',
      verifiedAt: new Date(),
    },
    update: {},
  });

  const venues = [
    { slug: 'the-white-hotel', name: 'The White Hotel', city: 'Manchester', postcode: 'M3 5EN', addressLine1: 'Dickinson Street', capacity: 400 },
    { slug: 'the-louisiana', name: 'The Louisiana', city: 'Bristol', postcode: 'BS1 6UA', addressLine1: 'Wapping Road', capacity: 140 },
    { slug: 'brudenell-social-club', name: 'Brudenell Social Club', city: 'Leeds', postcode: 'LS6 1LG', addressLine1: '33 Queens Rd', capacity: 450 },
    { slug: 'corsica-studios', name: 'Corsica Studios', city: 'London', postcode: 'SE17 3AH', addressLine1: '4-5 Elephant Rd', capacity: 500 },
    { slug: 'soup-kitchen', name: 'Soup Kitchen', city: 'Manchester', postcode: 'M4 1HN', addressLine1: '31-33 Spear Street', capacity: 300 },
  ];
  for (const v of venues) {
    await db.venue.upsert({ where: { slug: v.slug }, create: v, update: {} });
  }

  const catMap = Object.fromEntries(
    (await db.category.findMany()).map((c) => [c.slug, c.id] as const),
  );
  const venueMap = Object.fromEntries((await db.venue.findMany()).map((v) => [v.slug, v] as const));

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const demoEvents = [
    {
      title: 'Friday Frequencies · Warehouse session',
      subtitle: 'UK garage, 2-step and bassline until 4am',
      slug: 'friday-frequencies-manchester-apr',
      venue: 'the-white-hotel',
      categories: ['club-nights', 'garage', 'electronic'],
      startsAt: daysFromNow(14),
      endsAt: daysFromNow(14 + 0.25),
      ageRating: 'AGE_18_PLUS' as const,
      description:
        "Our flagship warehouse party returns for a late spring special. Full Funktion-One rig, strobes, no phones on the dancefloor. Support from two residents plus a special guest we can't announce until the door.",
      ticketTypes: [
        { name: 'Early bird', faceValue: 800n, capacity: 100 },
        { name: 'General admission', faceValue: 1200n, capacity: 250 },
      ],
    },
    {
      title: 'Deadbeat Records showcase',
      subtitle: 'Three bands, label night, cheap pints',
      slug: 'deadbeat-showcase-leeds-may',
      venue: 'brudenell-social-club',
      categories: ['gigs', 'rock-indie'],
      startsAt: daysFromNow(30),
      endsAt: daysFromNow(30 + 0.2),
      ageRating: 'AGE_14_PLUS' as const,
      description:
        'Deadbeat Records hit the Brudenell with three of the label\'s brightest for an early-summer showcase. Doors 7:30pm. 14+ with adult, unaccompanied 18+.',
      ticketTypes: [
        { name: 'Early bird', faceValue: 800n, capacity: 80 },
        { name: 'Advance', faceValue: 1200n, capacity: 300 },
        { name: 'On the door', faceValue: 1500n, capacity: 50 },
      ],
    },
    {
      title: 'Cutoff · Techno all-nighter',
      subtitle: '10pm–6am · headliner TBA · strictly 21+',
      slug: 'cutoff-techno-london-may',
      venue: 'corsica-studios',
      categories: ['club-nights', 'techno', 'electronic'],
      startsAt: daysFromNow(21),
      endsAt: daysFromNow(21 + 0.33),
      ageRating: 'AGE_21_PLUS' as const,
      description:
        'Six hours of uncompromising techno across both rooms. No photography, no cloakroom queues, one genre all night. Headliner announced day-of-show.',
      ticketTypes: [
        { name: 'Tier 1', faceValue: 1500n, capacity: 100 },
        { name: 'Tier 2', faceValue: 1800n, capacity: 200 },
        { name: 'Tier 3', faceValue: 2200n, capacity: 200 },
      ],
    },
    {
      title: 'Low End Gathering · DnB & Jungle',
      subtitle: 'Bristol heads for classics and fresh tools',
      slug: 'low-end-gathering-bristol-jun',
      venue: 'the-louisiana',
      categories: ['club-nights', 'drum-and-bass'],
      startsAt: daysFromNow(38),
      endsAt: daysFromNow(38 + 0.3),
      ageRating: 'AGE_18_PLUS' as const,
      description:
        'Intimate 140-cap drum & bass night. Two back-to-back sets from local residents, one 90-min headline from a Bristol institution.',
      ticketTypes: [
        { name: 'General admission', faceValue: 1000n, capacity: 100 },
        { name: 'Late release', faceValue: 1300n, capacity: 40 },
      ],
    },
  ];

  for (const e of demoEvents) {
    await db.event.upsert({
      where: { slug: e.slug },
      create: {
        slug: e.slug,
        organiserId: organiser.id,
        venueId: venueMap[e.venue]!.id,
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
        categories: {
          create: e.categories.filter((c) => catMap[c]).map((c) => ({ categoryId: catMap[c]! })),
        },
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

  console.log('✓ Seeded music-only taxonomy: 1 organiser, 5 venues, 4 events, 15 categories.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
