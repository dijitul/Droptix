import { db } from '../db';
import { sendMail } from '../mail';
import { env } from '@/lib/env';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { formatLongDate, formatEventTime } from '@/lib/format';

/**
 * Send an order-confirmation email with links to every ticket.
 * Plain HTML + plain text — no client-side tracking, no open tracking
 * (we don't need 0.2% CTR uplift at the cost of privacy trust).
 *
 * Called from the `email.send` BullMQ queue. See `src/server/workers`
 * (Phase 0d will add the worker entry file that wires this up).
 */

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: { include: { venue: true, organiser: true } },
      tickets: { include: { ticketType: true } },
    },
  });
  if (!order) throw new Error(`Order ${orderId} not found for email send`);
  if (order.status !== 'PAID') return; // belt + braces

  const total = Money.fromMinor(order.totalAmount, order.currency as Currency).format();
  const dateStr = `${formatLongDate(order.event.startsAt)} · Doors ${formatEventTime(order.event.doorsOpenAt ?? order.event.startsAt)}`;

  const ticketLinks = order.tickets
    .map(
      (t) => `
        <tr>
          <td style="padding: 12px 0; border-top: 1px solid #E6E6EC;">
            <div style="font-weight: 600;">${escape(t.ticketType.name)}</div>
            <div style="font-family: ui-monospace, monospace; font-size: 14px; color: #5B5B66;">${t.doorCode}</div>
          </td>
          <td style="padding: 12px 0; border-top: 1px solid #E6E6EC; text-align: right;">
            <a href="${env.NEXT_PUBLIC_APP_URL}/tickets/${t.id}" style="color: #6D28D9; text-decoration: none; font-weight: 500;">View ticket →</a>
          </td>
        </tr>`,
    )
    .join('');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0B0B12;">
      <div style="background: #6D28D9; color: #fff; padding: 20px 24px; border-radius: 14px 14px 0 0;">
        <div style="font-size: 14px; opacity: 0.9;">You're in.</div>
        <div style="font-size: 22px; font-weight: 600; margin-top: 4px;">${escape(order.event.title)}</div>
      </div>
      <div style="background: #fff; border: 1px solid #E6E6EC; border-top: 0; border-radius: 0 0 14px 14px; padding: 24px;">
        <div style="color: #5B5B66; font-size: 14px; margin-bottom: 8px;">${escape(dateStr)}</div>
        ${order.event.venue ? `<div style="font-weight: 500; margin-bottom: 20px;">${escape(order.event.venue.name)}, ${escape(order.event.venue.city)}</div>` : ''}

        <table style="width: 100%; border-collapse: collapse;">${ticketLinks}</table>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E6E6EC; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; color: #5B5B66;">
            <span>Booking reference</span>
            <span style="font-family: ui-monospace, monospace; color: #0B0B12;">${order.reference}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-weight: 600;">
            <span>Total paid</span>
            <span>${total}</span>
          </div>
        </div>
      </div>
      <div style="color: #5B5B66; font-size: 12px; margin-top: 16px; text-align: center;">
        Organiser: ${escape(order.event.organiser.name)} · Tickets via <a href="${env.NEXT_PUBLIC_APP_URL}" style="color: #6D28D9;">Droptix</a>
      </div>
    </div>
  `;

  const textBody = [
    `You're in — ${order.event.title}`,
    '',
    dateStr,
    order.event.venue ? `${order.event.venue.name}, ${order.event.venue.city}` : '',
    '',
    'Your tickets:',
    ...order.tickets.map((t) => `  · ${t.ticketType.name} — ${t.doorCode} — ${env.NEXT_PUBLIC_APP_URL}/tickets/${t.id}`),
    '',
    `Reference: ${order.reference}`,
    `Total paid: ${total}`,
    '',
    `Organiser: ${order.event.organiser.name}`,
    `Tickets via Droptix — ${env.NEXT_PUBLIC_APP_URL}`,
  ].join('\n');

  await sendMail({
    to: { email: order.buyerEmail, name: order.buyerName },
    subject: `You're in — ${order.event.title}`,
    htmlBody,
    textBody,
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
