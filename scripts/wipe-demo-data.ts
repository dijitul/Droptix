/**
 * Wipe demo events + their dependents cleanly.
 *
 * Usage:
 *    pnpm tsx scripts/wipe-demo-data.ts
 *
 * Targets the 'droptix-presents' demo organiser only — real organisers
 * and their events are untouched. Deletes in dependency order so FK
 * constraints are respected.
 *
 * Run this once on a production instance to clear pre-launch seed data
 * before real events go live.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DEMO_ORGANISER_SLUG = 'droptix-presents';
const DEMO_EVENT_SLUGS = [
  'friday-frequencies-manchester-apr',
  'nightshift-comedy-bristol-may',
  'deadbeat-showcase-leeds-may',
  'cutoff-techno-london-may',
  'low-end-gathering-bristol-jun',
];

async function main() {
  console.log('Finding demo events to wipe…');

  // Target: events owned by the demo organiser OR matching a known demo slug
  const events = await db.event.findMany({
    where: {
      OR: [
        { organiser: { slug: DEMO_ORGANISER_SLUG } },
        { slug: { in: DEMO_EVENT_SLUGS } },
      ],
    },
    select: { id: true, slug: true, title: true },
  });

  if (events.length === 0) {
    console.log('No demo events to wipe.');
    return;
  }

  console.log(`Wiping ${events.length} events + dependents:`);
  for (const e of events) console.log(`  · ${e.slug} (${e.title})`);

  const eventIds = events.map((e) => e.id);

  // Delete in dependency order. Most of these cascade via schema, but
  // being explicit keeps the script safe across schema edits.
  await db.$transaction([
    db.scanEvent.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.ticket.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.refund.deleteMany({ where: { order: { eventId: { in: eventIds } } } }),
    db.orderItem.deleteMany({ where: { order: { eventId: { in: eventIds } } } }),
    db.order.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.ticketType.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.eventCategory.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.eventImage.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.scannerCrew.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.wishlist.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.event.deleteMany({ where: { id: { in: eventIds } } }),
  ]);

  console.log(`✓ Deleted ${events.length} events + every dependent row.`);

  // Optionally remove the demo organiser itself if it has no remaining
  // events (it shouldn't, after the above). Real organisers with their
  // own membership are untouched.
  const demo = await db.organiser.findUnique({
    where: { slug: DEMO_ORGANISER_SLUG },
    include: { _count: { select: { events: true, payouts: true } } },
  });
  if (demo && demo._count.events === 0 && demo._count.payouts === 0) {
    await db.organiserMember.deleteMany({ where: { organiserId: demo.id } });
    await db.commissionRule.deleteMany({ where: { organiserId: demo.id } });
    await db.organiser.delete({ where: { id: demo.id } });
    console.log(`✓ Removed the ${DEMO_ORGANISER_SLUG} demo organiser.`);
  }

  console.log('');
  console.log('Clean slate ready. Your real organisers + their data are untouched.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
