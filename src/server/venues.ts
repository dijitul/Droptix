'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { requireAdmin, requireOrganiser } from './guards';

/**
 * Venue CRUD.
 *
 * Both organisers and admins can CREATE venues (low friction during
 * event setup). Only admins can EDIT or DELETE — this prevents one
 * organiser's edit from breaking another's event and keeps canonical
 * venue data clean. Admins can merge duplicate venues if they crop up.
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

type VenueInput = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postcode: string;
  country?: string;
  capacity?: number | null;
  websiteUrl?: string | null;
  description?: string | null;
  accessibilityNotes?: string | null;
};

function parseVenueForm(formData: FormData): VenueInput {
  const name = String(formData.get('name') ?? '').trim();
  const addressLine1 = String(formData.get('addressLine1') ?? '').trim();
  const addressLine2 = (String(formData.get('addressLine2') ?? '').trim() || null);
  const city = String(formData.get('city') ?? '').trim();
  const postcode = String(formData.get('postcode') ?? '').trim().toUpperCase();
  const country = String(formData.get('country') ?? 'GB').trim().toUpperCase() || 'GB';
  const capacityStr = String(formData.get('capacity') ?? '').trim();
  const capacity = capacityStr ? Number(capacityStr) : null;
  const websiteUrl = (String(formData.get('websiteUrl') ?? '').trim() || null);
  const description = (String(formData.get('description') ?? '').trim() || null);
  const accessibilityNotes = (String(formData.get('accessibilityNotes') ?? '').trim() || null);

  if (name.length < 2) throw new Error("Venue needs a name.");
  if (addressLine1.length < 3) throw new Error('Street address required.');
  if (city.length < 2) throw new Error('City required.');
  if (!/^[A-Z0-9\s]{3,10}$/.test(postcode)) throw new Error('Enter a valid postcode (e.g. M3 5EN).');
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 200_000)) {
    throw new Error('Capacity must be a positive integer.');
  }
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
    throw new Error('Website URL must start with http:// or https://');
  }

  return {
    name,
    addressLine1,
    addressLine2,
    city,
    postcode,
    country,
    capacity,
    websiteUrl,
    description,
    accessibilityNotes,
  };
}

export async function createVenue(formData: FormData): Promise<void> {
  await requireOrganiser(); // admins pass this too
  const input = parseVenueForm(formData);

  let slug = slugify(input.name);
  if (!slug) slug = `venue-${Date.now().toString(36)}`;
  while (await db.venue.findUnique({ where: { slug } })) {
    slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const venue = await db.venue.create({
    data: {
      slug,
      name: input.name,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? undefined,
      city: input.city,
      postcode: input.postcode,
      country: input.country ?? 'GB',
      capacity: input.capacity ?? undefined,
      websiteUrl: input.websiteUrl ?? undefined,
      description: input.description ?? undefined,
      accessibilityNotes: input.accessibilityNotes ?? undefined,
    },
  });

  revalidatePath('/admin/venues');
  revalidatePath('/organiser/events/new');

  // Where to send the user after save depends on entry point
  const redirectTo = String(formData.get('redirectTo') ?? '').trim();
  if (redirectTo.startsWith('/organiser') || redirectTo === '/admin/venues') {
    redirect(`${redirectTo}?venue=${venue.id}`);
  }
  redirect('/admin/venues');
}

export async function updateVenue(venueId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const input = parseVenueForm(formData);

  await db.venue.update({
    where: { id: venueId },
    data: {
      name: input.name,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      postcode: input.postcode,
      country: input.country ?? 'GB',
      capacity: input.capacity,
      websiteUrl: input.websiteUrl,
      description: input.description,
      accessibilityNotes: input.accessibilityNotes,
    },
  });

  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${venueId}/edit`);
  revalidatePath(`/venues/${input.name}`); // rough — cache miss is safe
}

export async function deleteVenue(venueId: string): Promise<void> {
  await requireAdmin();

  const venue = await db.venue.findUnique({
    where: { id: venueId },
    include: { _count: { select: { events: true } } },
  });
  if (!venue) throw new Error('Venue not found.');
  if (venue._count.events > 0) {
    throw new Error(
      `Can't delete — ${venue._count.events} events use this venue. Re-assign them first or rename this one.`,
    );
  }

  await db.venue.delete({ where: { id: venueId } });
  revalidatePath('/admin/venues');
}
