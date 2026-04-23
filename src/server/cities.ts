'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from './db';
import { requireAdmin } from './guards';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

type CityInput = {
  name: string;
  country: string;
  region?: string | null;
  featured: boolean;
  description?: string | null;
};

function parseCityForm(formData: FormData): CityInput {
  const name = String(formData.get('name') ?? '').trim();
  const country = (String(formData.get('country') ?? 'GB').trim().toUpperCase() || 'GB').slice(0, 2);
  const region = (String(formData.get('region') ?? '').trim() || null);
  const featured = formData.get('featured') === 'on';
  const description = (String(formData.get('description') ?? '').trim() || null);

  if (name.length < 2) throw new Error('City name required.');

  return { name, country, region, featured, description };
}

export async function createCity(formData: FormData): Promise<void> {
  await requireAdmin();
  const input = parseCityForm(formData);

  let slug = slugify(input.name);
  if (!slug) slug = `city-${Date.now().toString(36)}`;
  while (await db.city.findUnique({ where: { slug } })) {
    slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  await db.city.create({
    data: {
      slug,
      name: input.name,
      country: input.country,
      region: input.region ?? undefined,
      featured: input.featured,
      description: input.description ?? undefined,
    },
  });

  revalidatePath('/admin/cities');
  revalidatePath('/cities');
  redirect('/admin/cities');
}

export async function updateCity(cityId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const input = parseCityForm(formData);

  await db.city.update({
    where: { id: cityId },
    data: {
      name: input.name,
      country: input.country,
      region: input.region,
      featured: input.featured,
      description: input.description,
    },
  });

  revalidatePath('/admin/cities');
  revalidatePath(`/admin/cities/${cityId}/edit`);
  revalidatePath('/cities');
}

export async function deleteCity(cityId: string): Promise<void> {
  await requireAdmin();
  const city = await db.city.findUnique({
    where: { id: cityId },
    include: { _count: { select: { venues: true } } },
  });
  if (!city) throw new Error('City not found.');
  if (city._count.venues > 0) {
    throw new Error(
      `Can't delete — ${city._count.venues} venues link to this city. Re-link them first.`,
    );
  }
  await db.city.delete({ where: { id: cityId } });
  revalidatePath('/admin/cities');
}

/**
 * One-shot backfill — creates a City row for every unique venue.city
 * string and links venue.cityRefId. Idempotent, safe to re-run.
 */
export async function backfillCitiesFromVenues(): Promise<{ created: number; linked: number }> {
  await requireAdmin();

  const venues = await db.venue.findMany({
    select: { id: true, city: true, country: true, cityRefId: true },
  });

  const byName = new Map<string, string>();
  let created = 0;
  let linked = 0;

  for (const v of venues) {
    if (v.cityRefId) continue;
    if (!v.city) continue;

    const cityName = v.city.trim();
    let cityId = byName.get(cityName);

    if (!cityId) {
      const existing = await db.city.findFirst({ where: { name: cityName } });
      if (existing) {
        cityId = existing.id;
      } else {
        const slug = slugify(cityName) || `city-${Date.now().toString(36)}`;
        const fresh = await db.city.create({
          data: {
            slug,
            name: cityName,
            country: v.country ?? 'GB',
          },
        });
        cityId = fresh.id;
        created++;
      }
      byName.set(cityName, cityId);
    }

    await db.venue.update({ where: { id: v.id }, data: { cityRefId: cityId } });
    linked++;
  }

  revalidatePath('/admin/cities');
  return { created, linked };
}
