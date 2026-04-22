'use server';

import { db } from './db';
import { requireOrganiser } from './guards';
import { verifyTicket } from '@/lib/ticket-signing';
import type { ScanStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Scan verification — called by the scanner PWA after it reads a QR.
 *
 * Enforces first-scan-wins at the application layer (MariaDB doesn't
 * support partial unique indexes). Uses a row lock on the Ticket via
 * `SELECT ... FOR UPDATE` within a transaction so two door devices
 * scanning simultaneously can't both succeed.
 */

type ScanInput = {
  eventId: string;
  payload: string; // raw QR contents — base64url(id).base64url(hmac)
  deviceId: string;
  scannerCrewId?: string;
};

export type ScanResult =
  | {
      status: 'ACCEPTED';
      ticket: {
        id: string;
        doorCode: string;
        holderName: string;
        ticketTypeName: string;
      };
    }
  | {
      status: Exclude<ScanStatus, 'ACCEPTED' | 'OFFLINE_ACCEPTED_PENDING'>;
      message: string;
      ticket?: { holderName: string; ticketTypeName: string; scannedAt?: Date };
    };

export async function verifyScan(input: ScanInput): Promise<ScanResult> {
  // Caller must be an organiser member of the event's org.
  const user = await requireOrganiser();
  const event = await db.event.findFirst({
    where: { id: input.eventId, organiser: { members: { some: { userId: user.id } } } },
    select: { id: true, ticketSigningKey: true },
  });
  if (!event) {
    return { status: 'REJECTED_NOT_FOUND', message: 'Event not found or not yours.' };
  }

  // Verify signature (can be done offline too, but re-check server-side)
  const verification = verifyTicket({
    payload: input.payload,
    issuedAt: new Date(0), // issuedAt is baked into the HMAC; we reconstruct below via DB lookup
    eventSigningKey: event.ticketSigningKey,
  });

  let ticketId = verification.ticketId;

  // The HMAC includes issuedAt (unix seconds). Because we don't have it on
  // the client side, verify against the DB-stored issuedAt after we load.
  if (!ticketId) {
    await db.scanEvent.create({
      data: {
        eventId: event.id,
        deviceId: input.deviceId,
        scannerCrewId: input.scannerCrewId,
        status: 'REJECTED_INVALID_SIG',
        signatureValid: false,
        rawPayload: input.payload.slice(0, 256),
      },
    });
    return { status: 'REJECTED_INVALID_SIG', message: "That doesn't look like a Droptix ticket." };
  }

  return db.$transaction(async (tx) => {
    // SELECT ... FOR UPDATE — serialise concurrent scans on the same ticket
    const ticketRows = await tx.$queryRaw<
      Array<{
        id: string;
        eventId: string;
        status: string;
        holderName: string;
        doorCode: string;
        issuedAt: Date;
        ticketTypeName: string;
      }>
    >`
      SELECT t.id, t.eventId, t.status, t.holderName, t.doorCode, t.issuedAt,
             tt.name AS ticketTypeName
      FROM Ticket t
      JOIN TicketType tt ON tt.id = t.ticketTypeId
      WHERE t.id = ${ticketId}
      FOR UPDATE
    `;
    const ticket = ticketRows[0];

    if (!ticket) {
      await tx.scanEvent.create({
        data: {
          ticketId,
          eventId: event.id,
          deviceId: input.deviceId,
          scannerCrewId: input.scannerCrewId,
          status: 'REJECTED_NOT_FOUND',
          signatureValid: null,
          rawPayload: input.payload.slice(0, 256),
        },
      });
      return { status: 'REJECTED_NOT_FOUND', message: 'Ticket not recognised.' };
    }

    // Verify the signature against the DB-stored issuedAt (full HMAC check)
    const fullCheck = verifyTicket({
      payload: input.payload,
      issuedAt: ticket.issuedAt,
      eventSigningKey: event.ticketSigningKey,
    });
    if (!fullCheck.valid) {
      await tx.scanEvent.create({
        data: {
          ticketId: ticket.id,
          eventId: event.id,
          deviceId: input.deviceId,
          scannerCrewId: input.scannerCrewId,
          status: 'REJECTED_INVALID_SIG',
          signatureValid: false,
          rawPayload: input.payload.slice(0, 256),
        },
      });
      return { status: 'REJECTED_INVALID_SIG', message: 'Signature check failed.' };
    }

    if (ticket.eventId !== event.id) {
      await tx.scanEvent.create({
        data: {
          ticketId: ticket.id,
          eventId: event.id,
          deviceId: input.deviceId,
          scannerCrewId: input.scannerCrewId,
          status: 'REJECTED_WRONG_EVENT',
          signatureValid: true,
        },
      });
      return { status: 'REJECTED_WRONG_EVENT', message: 'Ticket is for a different event.' };
    }

    if (ticket.status === 'VOIDED') {
      return { status: 'REJECTED_VOIDED', message: 'Ticket voided — refunded or revoked.' };
    }

    if (ticket.status === 'SCANNED') {
      const prior = await tx.scanEvent.findFirst({
        where: { ticketId: ticket.id, status: 'ACCEPTED' },
        orderBy: { scannedAt: 'desc' },
      });
      await tx.scanEvent.create({
        data: {
          ticketId: ticket.id,
          eventId: event.id,
          deviceId: input.deviceId,
          scannerCrewId: input.scannerCrewId,
          status: 'REJECTED_ALREADY_SCANNED',
          signatureValid: true,
        },
      });
      return {
        status: 'REJECTED_ALREADY_SCANNED',
        message: `Already in — scanned ${prior?.scannedAt.toISOString() ?? 'earlier'}.`,
        ticket: {
          holderName: ticket.holderName,
          ticketTypeName: ticket.ticketTypeName,
          scannedAt: prior?.scannedAt,
        },
      };
    }

    // ACCEPT — first scan wins
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: 'SCANNED' },
    });
    await tx.scanEvent.create({
      data: {
        ticketId: ticket.id,
        eventId: event.id,
        deviceId: input.deviceId,
        scannerCrewId: input.scannerCrewId,
        status: 'ACCEPTED',
        signatureValid: true,
      },
    });

    revalidatePath(`/organiser/events/${event.id}/scanner`);

    return {
      status: 'ACCEPTED',
      ticket: {
        id: ticket.id,
        doorCode: ticket.doorCode,
        holderName: ticket.holderName,
        ticketTypeName: ticket.ticketTypeName,
      },
    };
  });
}

/** Quick stats for the scanner header: total scanned / total valid. */
export async function getScanStats(eventId: string) {
  const user = await requireOrganiser();
  const event = await db.event.findFirst({
    where: { id: eventId, organiser: { members: { some: { userId: user.id } } } },
    select: { id: true },
  });
  if (!event) throw new Error('Event not found.');

  const [total, scanned] = await Promise.all([
    db.ticket.count({ where: { eventId, status: { in: ['ISSUED', 'SCANNED'] } } }),
    db.ticket.count({ where: { eventId, status: 'SCANNED' } }),
  ]);

  return { total, scanned };
}
