import { describe, expect, it } from 'vitest';
import {
  generateDoorCode,
  generateEventSigningKey,
  signTicket,
  verifyTicket,
} from './ticket-signing';

describe('ticket signing', () => {
  it('signed payload verifies with the same key', () => {
    const key = generateEventSigningKey();
    const issuedAt = new Date('2026-05-01T19:00:00Z');
    const payload = signTicket({ ticketId: 'tkt_abc', issuedAt, eventSigningKey: key });

    const result = verifyTicket({ payload, issuedAt, eventSigningKey: key });
    expect(result.valid).toBe(true);
    expect(result.ticketId).toBe('tkt_abc');
  });

  it('rejects a payload signed with a different event key', () => {
    const keyA = generateEventSigningKey();
    const keyB = generateEventSigningKey();
    const issuedAt = new Date('2026-05-01T19:00:00Z');
    const payload = signTicket({ ticketId: 'tkt_abc', issuedAt, eventSigningKey: keyA });

    const result = verifyTicket({ payload, issuedAt, eventSigningKey: keyB });
    expect(result.valid).toBe(false);
    expect(result.ticketId).toBe('tkt_abc');
  });

  it('rejects a tampered HMAC', () => {
    const key = generateEventSigningKey();
    const issuedAt = new Date('2026-05-01T19:00:00Z');
    const payload = signTicket({ ticketId: 'tkt_abc', issuedAt, eventSigningKey: key });
    const tampered = payload.slice(0, -2) + (payload.slice(-2) === 'AA' ? 'BB' : 'AA');

    const result = verifyTicket({ payload: tampered, issuedAt, eventSigningKey: key });
    expect(result.valid).toBe(false);
  });

  it('rejects garbage input', () => {
    const key = generateEventSigningKey();
    const result = verifyTicket({
      payload: 'not-a-real-payload',
      issuedAt: new Date(),
      eventSigningKey: key,
    });
    expect(result.valid).toBe(false);
  });
});

describe('door codes', () => {
  it('matches the XXXX-XXXX shape', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateDoorCode()).toMatch(/^[23456789A-HJKMNP-W]{4}-[23456789A-HJKMNP-W]{4}$/);
    }
  });

  it('never emits ambiguous characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateDoorCode();
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
});
