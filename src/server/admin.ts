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
