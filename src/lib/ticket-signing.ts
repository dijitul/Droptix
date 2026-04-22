import { createHmac, randomBytes } from 'node:crypto';

/**
 * QR payload for a ticket:
 *
 *     base64url(ticketId) + "." + base64url(hmac)
 *
 * where hmac = HMAC-SHA256(ticketId || ":" || issuedAtUnix, event.ticketSigningKey).
 *
 * The scanner PWA can verify the signature offline, then look up the ticket
 * in its cached manifest or online DB. A forged ID has no valid HMAC; a real
 * ID has no valid HMAC under a rotated key. Per-event keys scope leaks.
 */

const SEP = '.';

export function generateEventSigningKey(): string {
  return randomBytes(32).toString('base64url');
}

export function signTicket(params: {
  ticketId: string;
  issuedAt: Date;
  eventSigningKey: string;
}): string {
  const payload = `${params.ticketId}:${Math.floor(params.issuedAt.getTime() / 1000)}`;
  const hmac = createHmac('sha256', Buffer.from(params.eventSigningKey, 'base64url'))
    .update(payload)
    .digest('base64url');
  const id = Buffer.from(params.ticketId).toString('base64url');
  return `${id}${SEP}${hmac}`;
}

export function verifyTicket(params: {
  payload: string;
  issuedAt: Date;
  eventSigningKey: string;
}): { valid: boolean; ticketId: string | null } {
  const [idPart, hmacPart] = params.payload.split(SEP);
  if (!idPart || !hmacPart) return { valid: false, ticketId: null };

  let ticketId: string;
  try {
    ticketId = Buffer.from(idPart, 'base64url').toString('utf8');
  } catch {
    return { valid: false, ticketId: null };
  }

  const expected = signTicket({ ticketId, issuedAt: params.issuedAt, eventSigningKey: params.eventSigningKey });
  const [, expectedHmac] = expected.split(SEP);

  // Timing-safe comparison
  if (!expectedHmac || expectedHmac.length !== hmacPart.length) {
    return { valid: false, ticketId };
  }
  let diff = 0;
  for (let i = 0; i < expectedHmac.length; i++) {
    diff |= expectedHmac.charCodeAt(i) ^ hmacPart.charCodeAt(i);
  }
  return { valid: diff === 0, ticketId };
}

/**
 * Human-readable door code for the manual-entry fallback.
 * Format: XXXX-XXXX using a 28-char ambiguity-free alphabet
 * (no 0/O/1/I/L to reduce mistypes under stress).
 */
const DOOR_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVW'; // 28 chars

export function generateDoorCode(): string {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += DOOR_ALPHABET[bytes[i]! % DOOR_ALPHABET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
