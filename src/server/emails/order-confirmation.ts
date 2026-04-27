import { db } from '../db';
import { sendMail } from '../mail';
import { env } from '@/lib/env';
import { Money } from '@/lib/money';
import type { Currency } from '@prisma/client';
import { formatLongDate, formatEventTime } from '@/lib/format';
import { BRAND, emailLayout, escapeHtml, metaRow } from './_layout';

/**
 * Send an order-confirmation email with links to every ticket.
 *
 * Industrial-brand HTML using the shared `_layout` shell. Includes
 * the event hero image (served from /api/images/[id], so any image
 * blocker fails gracefully to alt text). Plain-text fallback is
 * always sent so spam filters and screen readers see proper content.
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: {
        include: {
          venue: true,
          organiser: { select: { name: true, slug: true } },
          heroImage: { select: { id: true } },
        },
      },
      tickets: { include: { ticketType: true } },
    },
  });
  if (!order) throw new Error(`Order ${orderId} not found for email send`);
  if (order.status !== 'PAID') return; // belt + braces

  const total = Money.fromMinor(order.totalAmount, order.currency as Currency).format();
  const dateLong = formatLongDate(order.event.startsAt);
  const doorsTime = formatEventTime(order.event.doorsOpenAt ?? order.event.startsAt);
  const heroUrl = order.event.heroImage
    ? `${env.NEXT_PUBLIC_APP_URL}/api/images/${order.event.heroImage.id}`
    : null;
  const eventUrl = `${env.NEXT_PUBLIC_APP_URL}/events/${order.event.slug}`;

  // Hero block: render absolute URL + descriptive alt so when the
  // user's mail client blocks images, the alt explains the email.
  const heroHtml = heroUrl
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="background:${BRAND.surface}; border:2px solid ${BRAND.outlineVariant}; padding:0; line-height:0;">
          <a href="${eventUrl}" style="display:block; text-decoration:none;">
            <img
              src="${heroUrl}"
              alt="${escapeHtml(order.event.title)} — ${escapeHtml(dateLong)}"
              width="552"
              style="display:block; width:100%; max-width:552px; height:auto; border:0;"
            />
          </a>
        </td>
      </tr>
    </table>`
    : '';

  // Tickets table — each row links to the per-ticket QR page on the site.
  const ticketRows = order.tickets
    .map(
      (t) => `
        <tr>
          <td style="padding:16px 0; border-top:1px solid ${BRAND.outlineVariant};">
            <div style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size:15px; font-weight:700; color:${BRAND.onSurface}; margin-bottom:4px;">
              ${escapeHtml(t.ticketType.name)}
            </div>
            <div style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size:13px; color:${BRAND.tertiary}; letter-spacing:1.5px;">
              ${escapeHtml(t.doorCode)}
            </div>
          </td>
          <td align="right" style="padding:16px 0; border-top:1px solid ${BRAND.outlineVariant}; vertical-align:middle;">
            <a
              href="${env.NEXT_PUBLIC_APP_URL}/tickets/${t.id}"
              style="display:inline-block; padding:8px 14px; border:1.5px solid ${BRAND.primary}; color:${BRAND.primary}; text-decoration:none; font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase;"
            >
              View ticket →
            </a>
          </td>
        </tr>`,
    )
    .join('');

  const venueLine = order.event.venue
    ? `${escapeHtml(order.event.venue.name)}, ${escapeHtml(order.event.venue.city)}`
    : 'Venue: TBA';

  const bodyHtml = `
    ${heroHtml}

    <div style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:11px; color:${BRAND.primary}; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;">
      Confirmed · You're in
    </div>
    <h1 style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size:28px; font-weight:800; line-height:1.15; color:${BRAND.onSurface}; margin:0 0 24px; letter-spacing:-0.3px;">
      ${escapeHtml(order.event.title)}
    </h1>

    ${metaRow('Date', escapeHtml(dateLong))}
    ${metaRow('Doors', escapeHtml(doorsTime))}
    ${metaRow('Venue', venueLine)}
    ${metaRow('Promoter', escapeHtml(order.event.organiser.name))}

    <div style="margin:28px 0 12px; padding-top:16px; border-top:2px solid ${BRAND.outlineVariant};">
      <div style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:11px; color:${BRAND.tertiary}; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;">
        ${order.tickets.length} × Ticket
      </div>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${ticketRows}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px; padding-top:16px; border-top:2px solid ${BRAND.outlineVariant};">
      <tr>
        <td style="font-family:'JetBrains Mono', ui-monospace, monospace; font-size:12px; color:${BRAND.onSurfaceVariant}; letter-spacing:1px;">
          REF · ${escapeHtml(order.reference)}
        </td>
        <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size:18px; font-weight:800; color:${BRAND.primary};">
          ${escapeHtml(total)}
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0; font-size:13px; line-height:1.6; color:${BRAND.onSurfaceVariant};">
      Save this email or your ticket page — the QR code on the door is
      what gets you in. Need help? Reply to this email or hit the
      Support link below and we&rsquo;ll be on it.
    </p>
  `;

  const htmlBody = emailLayout({
    preheader: `Your tickets to ${order.event.title} on ${dateLong}`,
    bodyHtml,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    cta: { label: 'View all my tickets', href: `${env.NEXT_PUBLIC_APP_URL}/account/tickets` },
  });

  const textBody = [
    `You're in — ${order.event.title}`,
    '',
    `Date:    ${dateLong}`,
    `Doors:   ${doorsTime}`,
    order.event.venue
      ? `Venue:   ${order.event.venue.name}, ${order.event.venue.city}`
      : 'Venue:   TBA',
    `Promoter: ${order.event.organiser.name}`,
    '',
    'Your tickets:',
    ...order.tickets.map(
      (t) => `  · ${t.ticketType.name} — ${t.doorCode} — ${env.NEXT_PUBLIC_APP_URL}/tickets/${t.id}`,
    ),
    '',
    `Reference: ${order.reference}`,
    `Total paid: ${total}`,
    '',
    `All your tickets: ${env.NEXT_PUBLIC_APP_URL}/account/tickets`,
    `Tickets via Droptix — ${env.NEXT_PUBLIC_APP_URL}`,
  ].join('\n');

  await sendMail({
    to: { email: order.buyerEmail, name: order.buyerName },
    subject: `You're in — ${order.event.title}`,
    htmlBody,
    textBody,
  });
}
