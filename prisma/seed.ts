import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Platform-default commission rule (no organiser) — used for new sign-ups
  // until an admin sets a bespoke override.
  await db.commissionRule.upsert({
    where: { id: 'platform-default' },
    create: {
      id: 'platform-default',
      organiserId: null,
      percentageBps: 500, // 5.00%
      perTicketFee: 50n, // £0.50 in pence
      currency: 'GBP',
      feeMode: 'PASSED_TO_BUYER',
      freeEventsZeroFee: true,
      note: 'Platform default — set by system seed',
    },
    update: {},
  });

  // Seed top-level categories (UK scene taxonomy).
  const categories: Array<{ slug: string; name: string; order: number }> = [
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
    await db.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, order: c.order },
    });
  }

  // Feature flags — source of truth at runtime.
  const flags: Array<{ key: string; description: string; enabled: boolean }> = [
    { key: 'wallet_passes', description: 'Apple/Google Wallet pass generation', enabled: true },
    { key: 'face_value_resale', description: 'Face-value resale marketplace (post CMA 2025)', enabled: false },
    { key: 'reserved_seating', description: 'Assigned seat maps', enabled: false },
    { key: 'waitlist', description: 'Sold-out event waitlist', enabled: false },
    { key: 'referral_credit', description: 'Buyer-to-buyer referral credit', enabled: false },
    { key: 'refund_protection_upsell', description: 'Booking protection add-on at checkout', enabled: false },
  ];

  for (const f of flags) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      create: f,
      update: { description: f.description },
    });
  }

  console.log('Seeded platform defaults, categories, feature flags.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
