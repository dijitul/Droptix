import { notFound } from 'next/navigation';
import { Calendar, MapPin, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { db } from '@/server/db';
import { signTicket } from '@/lib/ticket-signing';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatLongDate, formatEventTime, toIsoLondon } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your ticket', robots: { index: false, follow: false } };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      event: { include: { venue: true, organiser: true } },
      ticketType: true,
    },
  });
  if (!ticket) notFound();

  const payload = signTicket({
    ticketId: ticket.id,
    issuedAt: ticket.issuedAt,
    eventSigningKey: ticket.event.ticketSigningKey,
  });

  // Generate QR server-side as an SVG data URL for crisp mobile display.
  const qrSvg = await QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'Q',
    margin: 1,
    color: { dark: '#0B0B12', light: '#FFFFFF' },
    width: 320,
  });

  const isVoided = ticket.status === 'VOIDED';
  const isScanned = ticket.status === 'SCANNED';

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6 sm:py-10"
    >
      <header>
        <Badge variant="soft" className="w-fit">Digital ticket</Badge>
        <h1 className="mt-2 text-xl font-semibold">{ticket.event.title}</h1>
      </header>

      <div
        className={`ticket-reveal flex flex-col overflow-hidden border-2 border-primary bg-surface-container shadow-glow ${isVoided || isScanned ? 'opacity-60' : ''}`}
      >
        <div className="flex flex-col items-center gap-3 bg-background p-6">
          {isVoided ? (
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-destructive">Voided</div>
              <p className="text-xs text-muted-foreground">
                This ticket has been refunded or revoked.
              </p>
            </div>
          ) : isScanned ? (
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold">Checked in</div>
              <p className="text-xs text-muted-foreground">
                Scanned at the door.
              </p>
            </div>
          ) : (
            <>
              <div
                className="overflow-hidden border-2 border-primary bg-white p-1"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                role="img"
                aria-label={`QR code for ticket ${ticket.doorCode}`}
              />
              <div className="text-center">
                <div className="font-mono text-2xl font-semibold tracking-wider">{ticket.doorCode}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Show this screen at the door. If the QR won&rsquo;t scan, give the code above.
                </p>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 p-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{ticket.ticketType.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Holder</span>
            <span className="font-medium">{ticket.holderName}</span>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <div className="text-foreground">
                <time dateTime={toIsoLondon(ticket.event.startsAt)}>
                  {formatLongDate(ticket.event.startsAt)}
                </time>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>Doors · {formatEventTime(ticket.event.doorsOpenAt ?? ticket.event.startsAt)}</div>
          </div>
          {ticket.event.venue && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <div className="font-medium text-foreground">{ticket.event.venue.name}</div>
                <div className="text-xs text-muted-foreground">
                  {ticket.event.venue.addressLine1}, {ticket.event.venue.city}{' '}
                  {ticket.event.venue.postcode}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Organiser: {ticket.event.organiser.name}
      </p>
    </main>
  );
}
