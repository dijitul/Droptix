import { db } from './db';
import { generateDoorCode } from '@/lib/ticket-signing';

/**
 * Issue ticket rows for a PAID order. Idempotent — called from the
 * Stripe webhook, which may retry on failure.
 *
 * Strategy:
 *  1. In a transaction, move Order PENDING → PAID (returns 0 if already paid)
 *  2. For each OrderItem, insert `quantity` Ticket rows (unique door codes)
 *  3. Update TicketType.soldCount and decrement reservedCount
 *  4. Return the created ticket IDs so the caller can queue email
 */

export async function issueTicketsForOrder(orderId: string): Promise<{ issued: string[]; alreadyIssued: boolean }> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error(`Order ${orderId} not found.`);
    if (order.status === 'PAID') return { issued: [], alreadyIssued: true };
    if (order.status !== 'PENDING') {
      throw new Error(`Order ${orderId} is ${order.status}; cannot issue tickets.`);
    }

    const updated = await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'PAID', paidAt: new Date() },
    });
    if (updated.count === 0) return { issued: [], alreadyIssued: true };

    const createdIds: string[] = [];

    for (const item of order.items) {
      const ticketType = await tx.ticketType.findUniqueOrThrow({ where: { id: item.ticketTypeId } });

      // Generate unique door codes — collisions are astronomically unlikely,
      // but loop-until-unique keeps the invariant clean.
      for (let i = 0; i < item.quantity; i++) {
        let doorCode = generateDoorCode();
        // eslint-disable-next-line no-await-in-loop
        while (await tx.ticket.findUnique({ where: { doorCode } })) {
          doorCode = generateDoorCode();
        }

        const ticket = await tx.ticket.create({
          data: {
            orderId: order.id,
            orderItemId: item.id,
            ticketTypeId: item.ticketTypeId,
            eventId: order.eventId,
            holderName: order.buyerName,
            holderEmail: order.buyerEmail,
            status: 'ISSUED',
            doorCode,
          },
        });
        createdIds.push(ticket.id);
      }

      // Bump soldCount + release the reservation
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          soldCount: { increment: item.quantity },
          reservedCount: { decrement: item.quantity },
        },
      });
      void ticketType;
    }

    return { issued: createdIds, alreadyIssued: false };
  });
}

/**
 * Release a reservation when a checkout session expires or is cancelled.
 * Called from the Stripe webhook on `checkout.session.expired`.
 */
export async function releaseOrderReservation(orderId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;
    if (order.status !== 'PENDING') return;

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    for (const item of order.items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { reservedCount: { decrement: item.quantity } },
      });
    }
  });
}
