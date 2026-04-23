/**
 * Bootstrap admin — the belt-and-braces login when email isn't set up yet.
 *
 * Usage:
 *    pnpm admin:bootstrap <email>
 *
 * Prints a ONE-CLICK URL. Click it in your browser, the /api/admin/bootstrap
 * route sets the session cookie server-side and forwards you to /admin.
 *
 * Then go to /admin/integrations and add Postmark + Stripe keys, at which
 * point the regular magic-link flow takes over.
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

const db = new PrismaClient();
const DEFAULT_TTL_DAYS = 30;

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: pnpm admin:bootstrap <email>');
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(`Not a valid email: ${email}`);
    process.exit(1);
  }

  const user = await db.user.upsert({
    where: { email },
    update: { role: 'SUPERADMIN', emailVerified: new Date() },
    create: { email, role: 'SUPERADMIN', emailVerified: new Date(), locale: 'en-GB' },
  });

  const sessionToken = randomBytes(48).toString('hex');
  const expires = new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://droptix.co.uk').replace(/\/$/, '');
  const bootstrapUrl = `${appUrl}/api/admin/bootstrap?t=${sessionToken}`;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✓ ${email} is SUPERADMIN  (expires ${expires.toISOString().slice(0, 16)}Z)`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Click this URL in your browser — sets the session cookie');
  console.log('  and forwards you to /admin:');
  console.log('');
  console.log(`    ${bootstrapUrl}`);
  console.log('');
  console.log('  (Works without any DevTools fiddling. One-time use is');
  console.log('   fine — you can run this script again any time to get a');
  console.log('   fresh URL.)');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
