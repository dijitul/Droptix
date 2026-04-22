import { PrismaClient } from '@prisma/client';

/**
 * Usage: pnpm tsx scripts/promote-admin.ts <email>
 *
 * Promotes the given user to SUPERADMIN. Run once after deploy so there's
 * at least one human who can log in to /admin/integrations and enter keys.
 * The user must have signed in once via magic link already.
 */

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: pnpm tsx scripts/promote-admin.ts <email>');
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user with email "${email}". They must sign in via magic link once first.`);
      process.exit(1);
    }

    await db.user.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' },
    });

    console.log(`✓ ${email} is now SUPERADMIN.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
