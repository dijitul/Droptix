import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Trash2, Plus, Pause, Play } from 'lucide-react';
import { requireOrganiser } from '@/server/guards';
import { db } from '@/server/db';
import {
  updateEvent,
  addTicketType,
  deleteTicketType,
  updateTicketType,
  setTicketTypePaused,
} from '@/server/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/lib/money';
import { HeroUploader } from './HeroUploader';
import type { Currency } from '@prisma/client';
import { ServerActionForm } from '@/components/server-action-form';

export const metadata = { title: 'Edit event' };
export const dynamic = 'force-dynamic';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganiser();
  const { id } = await params;

  // Admins can edit any event; organiser-members only their own.
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  const event = await db.event.findFirst({
    where: isAdmin
      ? { id }
      : { id, organiser: { members: { some: { userId: user.id } } } },
    include: {
      ticketTypes: { orderBy: { position: 'asc' } },
      heroImage: true,
      categories: { include: { category: true } },
    },
  });
  if (!event) notFound();

  const venues = await db.venue.findMany({ orderBy: { name: 'asc' } });

  // Format a stored UTC Date as a Europe/London wall-clock string for the
  // <input type="datetime-local"> default value. Matches what the user
  // originally typed; the Node runtime's offset is irrelevant here.
  const toLocalInput = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '01';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
        <Link href="/organiser/events" className="hover:text-primary">
          Events
        </Link>
        <span className="mx-2 text-outline">/</span>
        <span className="text-tertiary">{event.title}</span>
      </nav>

      <header className="flex items-end justify-between gap-3">
        <div>
          <Badge variant="tech" className="mb-3">{event.status.replace('_', ' ')}</Badge>
          <h1 className="text-display-md uppercase">{event.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/events/${event.slug}`} target="_blank">View public page</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/organiser/events/${event.id}/attendees`}>Attendees</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ServerActionForm
          action={updateEvent.bind(null, event.id)}
          className="flex flex-col gap-5"
          successMessage="Saved"
        >
          <Section title="Event details">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={event.title} required />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input id="subtitle" name="subtitle" defaultValue={event.subtitle ?? ''} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={event.description}
                required
              />
            </div>
          </Section>

          <Section title="Schedule & venue">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startsAt">Start</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toLocalInput(event.startsAt)} required />
              </div>
              <div>
                <Label htmlFor="endsAt">End</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toLocalInput(event.endsAt)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="venueId">Venue</Label>
              <select
                id="venueId"
                name="venueId"
                className="flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
                defaultValue={event.venueId ?? ''}
              >
                <option value="">— No venue —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} · {v.city}</option>
                ))}
              </select>
            </div>
          </Section>

          <Section title="Publishing">
            <div>
              <Label htmlFor="ageRating">Age rating</Label>
              <select
                id="ageRating"
                name="ageRating"
                defaultValue={event.ageRating}
                className="flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
              >
                <option value="ALL">All ages</option>
                <option value="AGE_14_PLUS">14+</option>
                <option value="AGE_16_PLUS">16+</option>
                <option value="AGE_18_PLUS">18+</option>
                <option value="AGE_21_PLUS">21+</option>
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={event.status}
                className="flex h-11 w-full border-0 border-b border-tertiary bg-surface-container-high px-3 py-2 text-foreground focus-visible:border-b-2 focus-visible:border-primary focus-visible:outline-none"
              >
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ON_SALE">On sale</option>
                <option value="POSTPONED">Postponed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </Section>

          <Button type="submit" size="lg">
            Save changes
          </Button>
        </ServerActionForm>

        <div className="flex flex-col gap-5">
          <Section title="Hero artwork">
            <HeroUploader eventId={event.id} initialUrl={event.heroImage ? `/api/images/${event.heroImage.id}` : null} />
          </Section>

          <Section title="Ticket types">
            {event.ticketTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ticket types yet. Add your first below.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {event.ticketTypes.map((tt) => {
                  // Convert BigInt minor pence → "12.00" string for the price input.
                  const priceMajor = (Number(tt.priceFaceValue) / 100).toFixed(2);
                  const now = new Date();
                  const notYet = tt.salesStartAt && tt.salesStartAt > now;
                  const ended = tt.salesEndAt && tt.salesEndAt < now;
                  // Status pill summarises the four sales states clearly so
                  // the organiser can glance the list without expanding rows.
                  const status: { label: string; variant: 'success' | 'hazard' | 'destructive' | 'outline' } =
                    tt.isPaused
                      ? { label: 'Paused', variant: 'destructive' }
                      : ended
                      ? { label: 'Sales ended', variant: 'outline' }
                      : notYet
                      ? { label: 'Scheduled', variant: 'hazard' }
                      : { label: 'On sale', variant: 'success' };

                  return (
                    <li key={tt.id}>
                      <details className="group border-2 border-outline-variant bg-surface-container-low">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 hover:bg-surface-container-high">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{tt.name}</span>
                              <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                            </div>
                            <div className="label-tech mt-1 text-muted-foreground">
                              {Money.fromMinor(tt.priceFaceValue, tt.currency as Currency).format()} ·{' '}
                              {tt.soldCount}/{tt.capacity} sold
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {/* Quick pause / resume toggle — no row expansion needed */}
                            <form action={setTicketTypePaused.bind(null, event.id, tt.id, !tt.isPaused)}>
                              <Button
                                type="submit"
                                size="sm"
                                variant={tt.isPaused ? 'outline' : 'ghost'}
                                aria-label={tt.isPaused ? `Resume ${tt.name} sales` : `Pause ${tt.name} sales`}
                              >
                                {tt.isPaused ? (
                                  <Play className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <Pause className="h-4 w-4" aria-hidden="true" />
                                )}
                                <span className="ml-1 hidden sm:inline">
                                  {tt.isPaused ? 'Resume' : 'Pause'}
                                </span>
                              </Button>
                            </form>
                            <span aria-hidden="true" className="text-xs text-muted-foreground group-open:rotate-180">▾</span>
                          </div>
                        </summary>

                        <ServerActionForm
                          action={updateTicketType.bind(null, event.id, tt.id)}
                          className="flex flex-col gap-3 border-t-2 border-outline-variant p-4"
                          successMessage="Ticket type updated"
                        >
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="col-span-2 sm:col-span-1">
                              <Label htmlFor={`tt-${tt.id}-name`}>Name</Label>
                              <Input id={`tt-${tt.id}-name`} name="name" defaultValue={tt.name} required />
                            </div>
                            <div>
                              <Label htmlFor={`tt-${tt.id}-price`}>Price (£)</Label>
                              <Input
                                id={`tt-${tt.id}-price`}
                                name="price"
                                inputMode="decimal"
                                defaultValue={priceMajor}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`tt-${tt.id}-cap`}>Capacity</Label>
                              <Input
                                id={`tt-${tt.id}-cap`}
                                name="capacity"
                                type="number"
                                min={Math.max(1, tt.soldCount)}
                                defaultValue={tt.capacity}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor={`tt-${tt.id}-max`}>Max per order</Label>
                              <Input
                                id={`tt-${tt.id}-max`}
                                name="maxPerOrder"
                                type="number"
                                min={1}
                                defaultValue={tt.maxPerOrder}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`tt-${tt.id}-start`}>
                                Sales open <span className="text-muted-foreground">(optional)</span>
                              </Label>
                              <Input
                                id={`tt-${tt.id}-start`}
                                name="salesStartAt"
                                type="datetime-local"
                                defaultValue={tt.salesStartAt ? toLocalInput(tt.salesStartAt) : ''}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`tt-${tt.id}-end`}>
                                Sales close <span className="text-muted-foreground">(optional, e.g. early-bird cutoff)</span>
                              </Label>
                              <Input
                                id={`tt-${tt.id}-end`}
                                name="salesEndAt"
                                type="datetime-local"
                                defaultValue={tt.salesEndAt ? toLocalInput(tt.salesEndAt) : ''}
                              />
                            </div>
                          </div>

                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="isPaused"
                              defaultChecked={tt.isPaused}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>Pause sales now (independent of the dates above)</span>
                          </label>

                          <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
                            <Button type="submit" size="sm">Save changes</Button>
                            <form action={deleteTicketType.bind(null, event.id, tt.id)}>
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                aria-label={`Delete ${tt.name}`}
                                disabled={tt.soldCount > 0}
                                title={tt.soldCount > 0 ? "Can't delete — tickets sold" : 'Delete this type'}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </form>
                          </div>
                        </ServerActionForm>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}

            <ServerActionForm
              action={addTicketType.bind(null, event.id)}
              className="mt-4 grid grid-cols-3 gap-2 border-t border-outline-variant pt-4"
              successMessage="Ticket type added"
            >
              <div className="col-span-3 sm:col-span-1">
                <Label htmlFor="tt-name">Name</Label>
                <Input id="tt-name" name="name" required placeholder="Early bird" />
              </div>
              <div>
                <Label htmlFor="tt-price">Price (£)</Label>
                <Input id="tt-price" name="price" inputMode="decimal" placeholder="12.00" required />
              </div>
              <div>
                <Label htmlFor="tt-capacity">Capacity</Label>
                <Input id="tt-capacity" name="capacity" type="number" min={1} placeholder="100" required />
              </div>
              <div className="col-span-3">
                <Button type="submit" size="sm" variant="outline">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add ticket type
                </Button>
              </div>
            </ServerActionForm>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-outline-variant bg-surface-container p-5">
      <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-tight">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
