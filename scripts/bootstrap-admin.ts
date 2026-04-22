/**
 * Bootstrap admin — the belt-and-braces login when email isn't set up yet.
 *
 * Usage:
 *    pnpm admin:bootstrap <email>
 *
 * What it does:
 *   1. Creates (or finds) a User by email
 *   2. Promotes them to SUPERADMIN
 *   3. Creates a valid Session row in the DB
 *   4. Prints a ready-to-paste browser cookie that logs you in instantly
 *
 * Paste the printed cookie into your browser (DevTools → Application →
 * Cookies → droptix.co.uk), refresh, and you're signed in as SUPERADMIN.
 * Then head straight to /admin/integrations and add your Stripe/Postmark
 * keys. Once Postmark is set, regular magic-link flow takes over.
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

const db = new PrismaClient();
const COOKIE_NAME = 'authjs.session-token';
const SECURE_COOKIE_NAME = '__Secure-authjs.session-token';
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
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://droptix.co.uk';
  const isHttps = appUrl.startsWith('https://');
  const cookieName = isHttps ? SECURE_COOKIE_NAME : COOKIE_NAME;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' ✓ Bootstrap session created');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  User         : ${user.email}`);
  console.log(`  Role         : SUPERADMIN`);
  console.log(`  Expires      : ${expires.toISOString()}`);
  console.log('');
  console.log('─── Paste this cookie into your browser ───────────────────');
  console.log('');
  console.log(`  Cookie name  : ${cookieName}`);
  console.log(`  Cookie value : ${sessionToken}`);
  console.log(`  Domain       : ${new URL(appUrl).hostname}`);
  console.log(`  Path         : /`);
  console.log(`  Secure       : ${isHttps ? 'yes' : 'no'}`);
  console.log(`  HttpOnly     : yes`);
  console.log(`  SameSite     : Lax`);
  console.log('');
  console.log('─── How ───────────────────────────────────────────────────');
  console.log('');
  console.log(`  1. Open ${appUrl} in your browser`);
  console.log('  2. DevTools → Application → Cookies → select the site');
  console.log('  3. Add new cookie with the name + value above');
  console.log('  4. Refresh the page');
  console.log('  5. You are signed in. Go to /admin/integrations.');
  console.log('');
  console.log('  (Alternative: copy-paste this into the browser console');
  console.log("   while on the site — it'll set the cookie for you:)");
  console.log('');
  console.log(
    `     document.cookie = '${cookieName}=${sessionToken}; Path=/; ${isHttps ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${DEFAULT_TTL_DAYS * 24 * 60 * 60}';`,
  );
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
