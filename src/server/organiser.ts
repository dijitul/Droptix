'use server';

import { redirect } from 'next/navigation';
import { db } from './db';
import { getStripe } from './stripe';
import { requireUser } from './guards';
import { env } from '@/lib/env';

/**
 * Organiser lifecycle helpers — create row, bootstrap Stripe Connect,
 * handle post-onboarding returns. Everything server-authoritative.
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/** Create an organiser row owned by the current user and send them to Stripe Connect. */
export async function createOrganiserAndStartOnboarding(formData: FormData): Promise<void> {
  const user = await requireUser();

  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  const email = String(formData.get('email') ?? user.email ?? '')
    .trim()
    .toLowerCase();

  if (name.length < 2) throw new Error('Tell us the name you promote shows under.');
  if (!email) throw new Error('We need a contact email.');

  // Generate a slug that's unique across the platform — append short rand if taken.
  let slug = slugify(name);
  if (!slug) slug = `org-${Date.now().toString(36)}`;
  while (await db.organiser.findUnique({ where: { slug } })) {
    slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const organiser = await db.organiser.create({
    data: {
      slug,
      name,
      email,
      city: city || null,
      status: 'PENDING',
      members: { create: [{ userId: user.id, role: 'owner' }] },
    },
  });

  // Promote the user to ORGANISER role if still BUYER
  if (user.role === 'BUYER') {
    await db.user.update({ where: { id: user.id }, data: { role: 'ORGANISER' } });
  }

  redirect(`/organiser/onboarding?org=${organiser.id}`);
}

/** Generate a fresh Stripe Connect Express account link for the given organiser. */
export async function createConnectAccountLink(organiserId: string): Promise<string> {
  const user = await requireUser();
  const organiser = await db.organiser.findFirst({
    where: { id: organiserId, members: { some: { userId: user.id } } },
  });
  if (!organiser) throw new Error('Organiser not found.');

  const stripe = await getStripe();

  let accountId = organiser.stripeAccountId;

  if (!accountId) {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: organiser.email,
        business_profile: {
          name: organiser.name,
          product_description: 'UK music event tickets via Droptix',
          url: `${env.NEXT_PUBLIC_APP_URL}/organisers/${organiser.slug}`,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { droptix_organiser_id: organiser.id },
      });
      accountId = account.id;
      await db.organiser.update({
        where: { id: organiser.id },
        data: { stripeAccountId: accountId },
      });
    } catch (err) {
      // Translate Stripe's common platform-side config errors into
      // actionable messages the organiser (or admin) can act on.
      const e = err as { type?: string; message?: string; raw?: { message?: string } };
      const rawMsg = e?.raw?.message ?? e?.message ?? '';

      if (/signed up for Connect/i.test(rawMsg)) {
        throw new Error(
          "Droptix's Stripe Connect isn't activated yet. An admin needs to visit " +
          'https://dashboard.stripe.com/connect (or /test/connect for test mode) and ' +
          'complete the platform setup. Takes about 5 minutes.',
        );
      }
      if (e?.type === 'StripeAuthenticationError') {
        throw new Error(
          "Stripe rejected our API key. An admin needs to re-check the Secret key at /admin/integrations.",
        );
      }
      if (e?.type === 'StripePermissionError') {
        throw new Error(
          "Our Stripe account doesn't have permission to create connected accounts. " +
          'Check that Connect is enabled on the platform account.',
        );
      }
      throw new Error(
        rawMsg
          ? `Couldn't create Stripe account: ${rawMsg}`
          : "Couldn't connect to Stripe — please try again in a minute.",
      );
    }
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/organiser/onboarding/refresh?org=${organiser.id}`,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/organiser/onboarding/return?org=${organiser.id}`,
    type: 'account_onboarding',
    collect: 'eventually_due',
  });

  return link.url;
}

/**
 * After Stripe redirects back — sync account status onto the organiser row.
 *
 * Pure data-sync: does NOT call revalidatePath. Next.js 15 forbids
 * revalidatePath during page render, and this function is invoked from
 * `/organiser/onboarding/return/page.tsx` during render. The return
 * page reads fresh data from the DB after calling this, so cache
 * invalidation isn't required — the next visit to /organiser re-reads
 * the row anyway (dynamic: 'force-dynamic').
 */
export async function syncConnectAccountStatus(organiserId: string): Promise<void> {
  const organiser = await db.organiser.findUnique({ where: { id: organiserId } });
  if (!organiser?.stripeAccountId) return;

  let stripe;
  try {
    stripe = await getStripe();
  } catch {
    // If Stripe keys are missing/misconfigured we can't sync — skip.
    // The return page will still render the org's last-known state.
    return;
  }

  let account: Awaited<ReturnType<typeof stripe.accounts.retrieve>>;
  try {
    account = await stripe.accounts.retrieve(organiser.stripeAccountId);
  } catch {
    // Stripe API glitch — don't throw from a page render. The periodic
    // account.updated webhook will reconcile shortly anyway.
    return;
  }

  await db.organiser.update({
    where: { id: organiser.id },
    data: {
      stripeChargesEnabled: Boolean(account.charges_enabled),
      stripePayoutsEnabled: Boolean(account.payouts_enabled),
      stripeOnboardedAt:
        account.details_submitted && !organiser.stripeOnboardedAt ? new Date() : organiser.stripeOnboardedAt,
      status:
        account.charges_enabled && organiser.status === 'PENDING' ? 'ACTIVE' : organiser.status,
    },
  });
  // Intentionally no revalidatePath — see docstring.
}
