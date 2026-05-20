'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { requireOrganiser } from './guards';
import { generateEventSigningKey } from '@/lib/ticket-signing';
import { parseLondonLocal } from '@/lib/format';
import type { AgeRating, EventStatus } from '@prisma/client';

/**
 * Organiser-side event CRUD. Ownership is enforced on every write via
 * the OrganiserMember join — a user can only mutate events for orgs
 * they're a member of.
 */

async function assertOrganiserOwns(eventId: string) {
  const user = await requireOrganiser();
  // Admins can act on any event; organisers only on their own.
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  const event = await db.event.findFirst({
    where: isAdmin
      ? { id: eventId }
      : { id: eventId, organiser: { members: { some: { userId: user.id } } } },
  });
  if (!event) throw new Error('Event not found or not yours.');
  return event;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export async function createEvent(formData: FormData): Promise<void> {
  const user = await requireOrganiser();
  const membership = await db.organiserMember.findFirstOrThrow({
    where: { userId: user.id },
    include: { organiser: true },
  });
  const org = membership.organiser;

  const title = String(formData.get('title') ?? '').trim();
  const subtitle = String(formData.get('subtitle') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim();
  const startsAtInput = String(formData.get('startsAt') ?? '');
  const endsAtInput = String(formData.get('endsAt') ?? '');
  const ageRating = String(formData.get('ageRating') ?? 'ALL') as AgeRating;
  const venueId = String(formData.get('venueId') ?? '') || null;
  const capacity = Number(formData.get('capacity') ?? 0);
  const status = (String(formData.get('status') ?? 'DRAFT') as EventStatus) ?? 'DRAFT';
  const categorySlugsRaw = formData.getAll('categories');
  const categorySlugs = categorySlugsRaw.map(String).filter(Boolean);

  // Stripe is only required to PUBLISH. DRAFT events don't need payment
  // infrastructure — organisers should be able to prep events while Stripe
  // onboarding is still processing.
  if (status !== 'DRAFT' && !org.stripeChargesEnabled) {
    throw new Error(
      "Save as Draft for now — Stripe onboarding needs to finish before this event can go on sale. It's in your dashboard.",
    );
  }

  if (title.length < 3) throw new Error('Event needs a title — at least 3 characters.');
  if (description.length < 10)
    throw new Error('Add a description of at least 10 characters — a rough line is fine, you can polish later.');
  if (!startsAtInput || !endsAtInput) throw new Error('Both start and end times are required.');

  // datetime-local inputs have no timezone — interpret as Europe/London
  // wall-clock so an organiser typing 18:00 in summer means 17:00Z, not 18:00Z.
  const startsAt = parseLondonLocal(startsAtInput);
  const endsAt = parseLondonLocal(endsAtInput);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error('Bad date format.');
  }
  if (endsAt <= startsAt) throw new Error('End time must be after start.');

  // Slug — unique globally
  let slug = slugify(title);
  if (!slug) slug = `event-${Date.now().toString(36)}`;
  while (await db.event.findUnique({ where: { slug } })) {
    slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const categories = await db.category.findMany({
    where: { slug: { in: categorySlugs } },
    select: { id: true },
  });

  const event = await db.event.create({
    data: {
      slug,
      organiserId: org.id,
      venueId,
      title,
      subtitle,
      description,
      status,
      attendanceMode: 'OFFLINE',
      ageRating,
      startsAt,
      endsAt,
      timezone: 'Europe/London',
      totalCapacity: capacity || null,
      currency: 'GBP',
      ticketSigningKey: generateEventSigningKey(),
      publishedAt: status === 'ON_SALE' || status === 'SCHEDULED' ? new Date() : null,
      onSaleAt: status === 'ON_SALE' ? new Date() : null,
      metaTitle: `${title} — tickets · Droptix`,
      metaDescription: subtitle ?? description.slice(0, 160),
      categories: { create: categories.map((c) => ({ categoryId: c.id })) },
    },
  });

  revalidatePath('/organiser/events');
  redirect(`/organiser/events/${event.id}/edit`);
}

export async function updateEvent(eventId: string, formData: FormData): Promise<void> {
  await assertOrganiserOwns(eventId);
  const title = String(formData.get('title') ?? '').trim();
  const subtitle = String(formData.get('subtitle') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim();
  const startsAt = parseLondonLocal(String(formData.get('startsAt') ?? ''));
  const endsAt = parseLondonLocal(String(formData.get('endsAt') ?? ''));
  const ageRating = String(formData.get('ageRating') ?? 'ALL') as AgeRating;
  const status = String(formData.get('status') ?? 'DRAFT') as EventStatus;
  const venueId = String(formData.get('venueId') ?? '') || null;

  if (title.length < 3) throw new Error('Title too short.');
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error('Bad date.');
  }

  await db.event.update({
    where: { id: eventId },
    data: {
      title,
      subtitle,
      description,
      startsAt,
      endsAt,
      ageRating,
      status,
      venueId,
      publishedAt: status === 'DRAFT' ? null : new Date(),
      onSaleAt: status === 'ON_SALE' ? new Date() : null,
      metaTitle: `${title} — tickets · Droptix`,
      metaDescription: subtitle ?? description.slice(0, 160),
    },
  });

  revalidatePath(`/organiser/events/${eventId}/edit`);
  revalidatePath('/organiser/events');
}

export async function addTicketType(eventId: string, formData: FormData): Promise<void> {
  await assertOrganiserOwns(eventId);

  const name = String(formData.get('name') ?? '').trim();
  const priceMajor = String(formData.get('price') ?? '').trim();
  const capacity = Number(formData.get('capacity') ?? 0);
  const maxPerOrder = Number(formData.get('maxPerOrder') ?? 10);

  if (!name) throw new Error('Ticket type needs a name.');
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Capacity must be a positive integer.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(priceMajor)) throw new Error('Bad price format.');

  const [wholeStr, fractionStr = '00'] = priceMajor.split('.');
  const priceMinor = BigInt(wholeStr ?? '0') * 100n + BigInt(fractionStr.padEnd(2, '0').slice(0, 2));

  await db.ticketType.create({
    data: {
      eventId,
      name,
      priceFaceValue: priceMinor,
      currency: 'GBP',
      capacity,
      maxPerOrder: Math.max(1, maxPerOrder),
      minPerOrder: 1,
    },
  });

  revalidatePath(`/organiser/events/${eventId}/edit`);
}

/**
 * Update an existing ticket type. Anything the organiser can edit
 * post-creation lives here: name, capacity, max-per-order, the sales
 * window, and the manual pause toggle. Price is also editable but
 * only when nothing's been sold — otherwise we'd have to deal with
 * mid-flight price changes between cart and checkout, which is a
 * different feature.
 */
export async function updateTicketType(
  eventId: string,
  ticketTypeId: string,
  formData: FormData,
): Promise<void> {
  await assertOrganiserOwns(eventId);
  const tt = await db.ticketType.findFirst({ where: { id: ticketTypeId, eventId } });
  if (!tt) throw new Error('Ticket type not found.');

  const name = String(formData.get('name') ?? tt.name).trim();
  const priceMajor = String(formData.get('price') ?? '').trim();
  const capacity = Number(formData.get('capacity') ?? tt.capacity);
  const maxPerOrder = Number(formData.get('maxPerOrder') ?? tt.maxPerOrder);
  const salesStartAtInput = String(formData.get('salesStartAt') ?? '').trim();
  const salesEndAtInput = String(formData.get('salesEndAt') ?? '').trim();
  // Checkbox <input type=checkbox name=isPaused>: 'on' when ticked.
  const isPaused = formData.get('isPaused') === 'on';

  if (!name) throw new Error('Ticket type needs a name.');
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error('Capacity must be a positive integer.');
  }
  if (capacity < tt.soldCount) {
    throw new Error(
      `Can't drop capacity below sold count (${tt.soldCount}). Refund or void some tickets first.`,
    );
  }
  if (!Number.isInteger(maxPerOrder) || maxPerOrder < 1) {
    throw new Error('Max-per-order must be a positive integer.');
  }

  let priceMinor: bigint = tt.priceFaceValue;
  if (priceMajor) {
    if (!/^-?\d+(\.\d{1,2})?$/.test(priceMajor)) throw new Error('Bad price format.');
    const [wholeStr, fractionStr = '00'] = priceMajor.split('.');
    const newPriceMinor =
      BigInt(wholeStr ?? '0') * 100n + BigInt(fractionStr.padEnd(2, '0').slice(0, 2));
    // Compare BigInts directly — no Money import needed, and this is
    // safer than string comparison (which trips on "10" vs "10.00").
    if (tt.soldCount > 0 && newPriceMinor !== tt.priceFaceValue) {
      throw new Error("Can't change price after tickets are sold. Create a new type instead.");
    }
    priceMinor = newPriceMinor;
  }

  // datetime-local inputs come back as YYYY-MM-DDTHH:mm. Empty = clear.
  // Use London-local parser so 18:00 means 18:00 UK time year-round.
  const salesStartAt = salesStartAtInput ? parseLondonLocal(salesStartAtInput) : null;
  const salesEndAt = salesEndAtInput ? parseLondonLocal(salesEndAtInput) : null;
  if (salesStartAt && Number.isNaN(salesStartAt.getTime())) {
    throw new Error('Sales start date is invalid.');
  }
  if (salesEndAt && Number.isNaN(salesEndAt.getTime())) {
    throw new Error('Sales end date is invalid.');
  }
  if (salesStartAt && salesEndAt && salesStartAt >= salesEndAt) {
    throw new Error('Sales end must be after sales start.');
  }

  await db.ticketType.update({
    where: { id: ticketTypeId },
    data: {
      name,
      priceFaceValue: priceMinor,
      capacity,
      maxPerOrder,
      salesStartAt,
      salesEndAt,
      isPaused,
    },
  });

  revalidatePath(`/organiser/events/${eventId}/edit`);
  revalidatePath(`/events`);
}

/**
 * Quick-toggle for the manual pause flag. Used by the inline
 * "Pause sales" / "Resume sales" button on the edit page so an
 * organiser can flip an early-bird off in one click without
 * re-saving the full ticket-type form.
 */
export async function setTicketTypePaused(
  eventId: string,
  ticketTypeId: string,
  paused: boolean,
): Promise<void> {
  await assertOrganiserOwns(eventId);
  const tt = await db.ticketType.findFirst({ where: { id: ticketTypeId, eventId } });
  if (!tt) throw new Error('Ticket type not found.');
  await db.ticketType.update({
    where: { id: ticketTypeId },
    data: { isPaused: paused },
  });
  revalidatePath(`/organiser/events/${eventId}/edit`);
}

export async function deleteTicketType(eventId: string, ticketTypeId: string): Promise<void> {
  await assertOrganiserOwns(eventId);
  const tt = await db.ticketType.findFirst({ where: { id: ticketTypeId, eventId } });
  if (!tt) throw new Error('Ticket type not found.');
  if (tt.soldCount > 0) throw new Error("Can't delete — tickets already sold. Hide it instead.");
  await db.ticketType.delete({ where: { id: ticketTypeId } });
  revalidatePath(`/organiser/events/${eventId}/edit`);
}

export async function setEventHeroImage(eventId: string, imageId: string): Promise<void> {
  await assertOrganiserOwns(eventId);
  await db.event.update({ where: { id: eventId }, data: { heroImageId: imageId } });
  revalidatePath(`/organiser/events/${eventId}/edit`);
}
