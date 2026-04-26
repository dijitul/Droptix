'use server';

import { revalidatePath } from 'next/cache';
import { db } from './db';
import { requireAdmin, requireSuperAdmin } from './guards';
import type { OrganiserStatus, UserRole, FeeMode, Currency } from '@prisma/client';

/**
 * Admin mutations. Every action validates the caller's role and writes
 * to AdminAudit so we have a paper trail for who did what and when.
 */

async function audit(params: {
  adminId: string;
  action: string;
  subject: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.adminAudit.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      subject: params.subject,
      before: (params.before as never) ?? undefined,
      after: (params.after as never) ?? undefined,
    },
  });
}

// ── Organisers ─────────────────────────────────────────────────────────
export async function setOrganiserStatus(
  organiserId: string,
  status: OrganiserStatus,
): Promise<void> {
  const admin = await requireAdmin();
  const before = await db.organiser.findUnique({
    where: { id: organiserId },
    select: { status: true },
  });
  await db.organiser.update({
    where: { id: organiserId },
    data: {
      status,
      verifiedAt: status === 'ACTIVE' ? new Date() : undefined,
    },
  });
  await audit({
    adminId: admin.id,
    action: 'organiser.status',
    subject: `organiser:${organiserId}`,
    before,
    after: { status },
  });
  revalidatePath('/admin/organisers');
}

// ── Commission ─────────────────────────────────────────────────────────
export async function upsertCommissionRule(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const organiserId = String(formData.get('organiserId') ?? '') || null;
  const percentInput = String(formData.get('percentage') ?? '').trim();
  const perTicketInput = String(formData.get('perTicketFee') ?? '').trim();
  const feeMode = String(formData.get('feeMode') ?? 'PASSED_TO_BUYER') as FeeMode;
  const freeEventsZeroFee = formData.get('freeEventsZeroFee') === 'on';
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!/^\d+(\.\d{1,2})?$/.test(percentInput)) throw new Error('Percent must be a number like 5 or 5.25');
  if (!/^\d+(\.\d{1,2})?$/.test(perTicketInput)) throw new Error('Per-ticket fee must be a number like 0.50');

  const percentageBps = Math.round(parseFloat(percentInput) * 100);
  const [wholeStr = '0', fractionStr = '00'] = perTicketInput.split('.');
  const perTicketFee = BigInt(wholeStr) * 100n + BigInt(fractionStr.padEnd(2, '0').slice(0, 2));

  // End any current rule for this organiser, then insert the new one.
  // Rules are immutable — we version by effectiveFrom.
  await db.$transaction(async (tx) => {
    await tx.commissionRule.updateMany({
      where: { organiserId, effectiveUntil: null },
      data: { effectiveUntil: new Date() },
    });
    await tx.commissionRule.create({
      data: {
        organiserId,
        percentageBps,
        perTicketFee,
        currency: 'GBP' as Currency,
        feeMode,
        freeEventsZeroFee,
        note,
        createdByAdminId: admin.id,
      },
    });
  });

  await audit({
    adminId: admin.id,
    action: 'commission.update',
    subject: organiserId ? `organiser:${organiserId}` : 'platform-default',
    after: { percentageBps, perTicketFee: perTicketFee.toString(), feeMode, freeEventsZeroFee },
  });

  revalidatePath('/admin/commission');
}

// ── User management ────────────────────────────────────────────────────
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const admin = await requireSuperAdmin();
  if (admin.id === userId && role !== 'SUPERADMIN') {
    throw new Error("You can't demote yourself. Ask another SUPERADMIN to do it.");
  }
  const before = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  await db.user.update({ where: { id: userId }, data: { role } });
  await audit({
    adminId: admin.id,
    action: 'user.role',
    subject: `user:${userId}`,
    before,
    after: { role },
  });
  revalidatePath('/admin/users');
}

// ── Events (admin-level) ───────────────────────────────────────────────
export async function adminSetEventStatus(
  eventId: string,
  status: 'DRAFT' | 'SCHEDULED' | 'ON_SALE' | 'SOLD_OUT' | 'POSTPONED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED',
): Promise<void> {
  const admin = await requireAdmin();
  const before = await db.event.findUnique({
    where: { id: eventId },
    select: { status: true, title: true, publishedAt: true },
  });
  if (!before) throw new Error('Event not found.');

  await db.event.update({
    where: { id: eventId },
    data: {
      status,
      // Draft or Cancelled = hidden from public; everything else visible.
      publishedAt: status === 'DRAFT' ? null : before.publishedAt ?? new Date(),
    },
  });

  await audit({
    adminId: admin.id,
    action: 'event.status',
    subject: `event:${eventId}`,
    before,
    after: { status },
  });
  revalidatePath('/admin/events');
  revalidatePath('/discover');
}

export async function adminDeleteEvent(eventId: string): Promise<void> {
  const admin = await requireAdmin();

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { orders: { where: { status: 'PAID' } }, tickets: true } },
      ticketTypes: { select: { soldCount: true } },
    },
  });
  if (!event) throw new Error('Event not found.');

  const totalSold = event.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
  if (event._count.orders > 0 || event._count.tickets > 0 || totalSold > 0) {
    throw new Error(
      `Can't hard-delete — this event has ${totalSold} tickets sold. Cancel it instead to trigger refunds, or use Force delete as SUPERADMIN.`,
    );
  }

  await db.event.delete({ where: { id: eventId } });

  await audit({
    adminId: admin.id,
    action: 'event.delete',
    subject: `event:${eventId}`,
    before: { title: event.title, slug: event.slug },
  });
  revalidatePath('/admin/events');
}

/**
 * Nuclear force-delete for a stuck event (lingering unpaid orders,
 * test scans, hung reservations). SUPERADMIN-only. Still refuses if
 * any PAID tickets are attached — refund-then-cancel is the right
 * path for real sales.
 */
export async function adminForceDeleteEvent(eventId: string): Promise<void> {
  const admin = await requireSuperAdmin();

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { orders: { where: { status: 'PAID' } } } },
      ticketTypes: { select: { soldCount: true } },
    },
  });
  if (!event) throw new Error('Event not found.');

  const totalSold = event.ticketTypes.reduce((s, t) => s + t.soldCount, 0);
  if (totalSold > 0 || event._count.orders > 0) {
    throw new Error(
      "Force-delete refuses events with PAID tickets. Cancel + refund first.",
    );
  }

  await db.$transaction([
    db.scanEvent.deleteMany({ where: { eventId } }),
    db.ticket.deleteMany({ where: { eventId } }),
    db.refund.deleteMany({ where: { order: { eventId } } }),
    db.orderItem.deleteMany({ where: { order: { eventId } } }),
    db.order.deleteMany({ where: { eventId } }),
    db.ticketType.deleteMany({ where: { eventId } }),
    db.eventCategory.deleteMany({ where: { eventId } }),
    db.eventArtist.deleteMany({ where: { eventId } }),
    db.eventImage.deleteMany({ where: { eventId } }),
    db.scannerCrew.deleteMany({ where: { eventId } }),
    db.wishlist.deleteMany({ where: { eventId } }),
    db.event.delete({ where: { id: eventId } }),
  ]);

  await audit({
    adminId: admin.id,
    action: 'event.force_delete',
    subject: `event:${eventId}`,
    before: { title: event.title, slug: event.slug },
  });
  revalidatePath('/admin/events');
}

/**
 * Purge an event — SUPERADMIN nuclear option that bypasses every guard,
 * INCLUDING PAID orders. The audit row records the destruction. This is
 * intended for cleaning test data before launch and ONLY this. Real
 * events with real sales should be cancelled-then-refunded, not purged.
 *
 * Caller must pass the event slug back as `confirmSlug` so a misclick
 * can't nuke a sibling row by mistake.
 */
export async function adminPurgeEvent(eventId: string, confirmSlug: string): Promise<void> {
  const admin = await requireSuperAdmin();

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTypes: { select: { soldCount: true, capacity: true } },
      _count: { select: { orders: true, tickets: true } },
    },
  });
  if (!event) throw new Error('Event not found.');
  if (event.slug !== confirmSlug) {
    throw new Error('Slug mismatch — refusing to purge a different event.');
  }

  const totalSold = event.ticketTypes.reduce((s, t) => s + t.soldCount, 0);

  await db.$transaction([
    db.scanEvent.deleteMany({ where: { eventId } }),
    db.ticket.deleteMany({ where: { eventId } }),
    db.refund.deleteMany({ where: { order: { eventId } } }),
    db.orderItem.deleteMany({ where: { order: { eventId } } }),
    db.order.deleteMany({ where: { eventId } }),
    db.ticketType.deleteMany({ where: { eventId } }),
    db.eventCategory.deleteMany({ where: { eventId } }),
    db.eventArtist.deleteMany({ where: { eventId } }),
    db.eventImage.deleteMany({ where: { eventId } }),
    db.scannerCrew.deleteMany({ where: { eventId } }),
    db.wishlist.deleteMany({ where: { eventId } }),
    db.event.delete({ where: { id: eventId } }),
  ]);

  await audit({
    adminId: admin.id,
    action: 'event.purge',
    subject: `event:${eventId}`,
    before: {
      title: event.title,
      slug: event.slug,
      orders: event._count.orders,
      tickets: event._count.tickets,
      sold: totalSold,
    },
  });
  revalidatePath('/admin/events');
  revalidatePath('/discover');
}

/**
 * Safely delete an empty organiser — refuses if it has any events,
 * payouts, or commission rules. Use case: cleaning up dead test orgs,
 * or an admin/superadmin who registered themselves as an organiser
 * (e.g. to test the flow) and now wants the org account gone while
 * keeping their user/admin role intact.
 */
export async function adminDeleteOrganiser(organiserId: string): Promise<void> {
  const admin = await requireAdmin();

  const org = await db.organiser.findUnique({
    where: { id: organiserId },
    include: {
      _count: { select: { events: true, payouts: true, commissionRules: true } },
    },
  });
  if (!org) throw new Error('Organiser not found.');

  if (org._count.events > 0 || org._count.payouts > 0) {
    throw new Error(
      `Can't delete — this organiser has ${org._count.events} event(s) and ${org._count.payouts} payout(s). Purge them first or use Purge organiser as SUPERADMIN.`,
    );
  }

  // Members + commission rules are safe to drop — no money attached.
  await db.$transaction([
    db.organiserMember.deleteMany({ where: { organiserId } }),
    db.commissionRule.deleteMany({ where: { organiserId } }),
    db.organiser.delete({ where: { id: organiserId } }),
  ]);

  await audit({
    adminId: admin.id,
    action: 'organiser.delete',
    subject: `organiser:${organiserId}`,
    before: { name: org.name, slug: org.slug, email: org.email },
  });
  revalidatePath('/admin/organisers');
}

/**
 * Purge an organiser AND all their events, members, rules, payouts.
 * SUPERADMIN-only. Refuses if the organiser has any events with PAID
 * orders unless `force=true` (passed alongside the slug). Use only
 * for cleaning test data before launch.
 *
 * Buyer User rows are NEVER touched — guests/buyers exist independent
 * of any organiser.
 */
export async function adminPurgeOrganiser(
  organiserId: string,
  confirmSlug: string,
): Promise<void> {
  const admin = await requireSuperAdmin();

  const org = await db.organiser.findUnique({
    where: { id: organiserId },
    include: { events: { select: { id: true } } },
  });
  if (!org) throw new Error('Organiser not found.');
  if (org.slug !== confirmSlug) {
    throw new Error('Slug mismatch — refusing to purge a different organiser.');
  }

  const eventIds = org.events.map((e) => e.id);

  await db.$transaction([
    // Cascade through every event the organiser owns first
    db.scanEvent.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.ticket.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.refund.deleteMany({ where: { order: { eventId: { in: eventIds } } } }),
    db.orderItem.deleteMany({ where: { order: { eventId: { in: eventIds } } } }),
    db.order.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.ticketType.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.eventCategory.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.eventArtist.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.eventImage.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.scannerCrew.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.wishlist.deleteMany({ where: { eventId: { in: eventIds } } }),
    db.event.deleteMany({ where: { id: { in: eventIds } } }),
    // Then the organiser itself
    db.payout.deleteMany({ where: { organiserId } }),
    db.commissionRule.deleteMany({ where: { organiserId } }),
    db.organiserMember.deleteMany({ where: { organiserId } }),
    db.organiser.delete({ where: { id: organiserId } }),
  ]);

  await audit({
    adminId: admin.id,
    action: 'organiser.purge',
    subject: `organiser:${organiserId}`,
    before: { name: org.name, slug: org.slug, eventCount: eventIds.length },
  });
  revalidatePath('/admin/organisers');
  revalidatePath('/admin/events');
  revalidatePath('/discover');
}

export async function inviteAdmin(formData: FormData): Promise<void> {
  const admin = await requireSuperAdmin();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? 'ADMIN') as UserRole;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email.');
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') throw new Error('Invite role must be ADMIN or SUPERADMIN.');

  // Upsert: create the user with the assigned role, or promote an
  // existing one. They'll need to sign in via magic link to get a
  // session (bootstrap script bypasses this for break-glass).
  await db.user.upsert({
    where: { email },
    update: { role },
    create: { email, role, locale: 'en-GB' },
  });

  await audit({
    adminId: admin.id,
    action: 'user.invite',
    subject: `email:${email}`,
    after: { role },
  });
  revalidatePath('/admin/users');
}
