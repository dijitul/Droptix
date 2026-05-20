'use server';

import { db } from './db';
import { requireOrganiser } from './guards';
import { sendOrderConfirmation } from './emails/order-confirmation';

/**
 * Order-level mutations admins + organisers can perform from the
 * attendees screen. Currently:
 *
 *   resendOrderConfirmation(orderId)
 *     Re-fires the buyer's confirmation email synchronously. Used
 *     when a buyer reports they never got the email (spam folder,
 *     typo'd domain, mail server bounce, etc).
 *
 * Authorisation: caller must be an admin OR a member of the
 * organiser that owns the event the order belongs to. Buyer User
 * rows are never targeted directly — this is an organiser-side
 * operation on an order they own.
 */
export async function resendOrderConfirmation(orderId: string): Promise<void> {
  const user = await requireOrganiser();
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      reference: true,
      event: { select: { id: true, organiserId: true } },
    },
  });
  if (!order) throw new Error('Order not found.');
  if (order.status !== 'PAID') {
    throw new Error(`Can't resend — order status is ${order.status}, not PAID.`);
  }

  // Ownership check: admins skip; organisers must be a member of the
  // org that owns the event tied to this order.
  if (!isAdmin) {
    const member = await db.organiserMember.findFirst({
      where: { userId: user.id, organiserId: order.event.organiserId },
      select: { id: true },
    });
    if (!member) throw new Error("Not your event.");
  }

  await sendOrderConfirmation(order.id);
}
