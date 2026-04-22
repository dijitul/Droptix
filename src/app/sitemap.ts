import type { MetadataRoute } from 'next';
import { db } from '@/server/db';

/**
 * Dynamic sitemap — homepage, discovery, every on-sale event, every city
 * with live events, every genre with live events, and every city+genre
 * combo. Split-by-shard comes later once we cross ~40k URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://droptix.co.uk';

  const [events, categories, venues] = await Promise.all([
    db.event.findMany({
      where: { publishedAt: { not: null }, startsAt: { gte: new Date() } },
      select: {
        slug: true,
        updatedAt: true,
        venue: { select: { city: true } },
        categories: { select: { category: { select: { slug: true } } } },
      },
      take: 10_000,
    }),
    db.category.findMany({ select: { slug: true } }),
    db.venue.findMany({ select: { city: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/discover`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/cities`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/genres`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/sell`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/sell/fees`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${baseUrl}/events/${e.slug}`,
    lastModified: e.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Cities with at least one live event
  const cities = new Set<string>();
  for (const e of events) if (e.venue?.city) cities.add(e.venue.city);
  const cityPages: MetadataRoute.Sitemap = Array.from(cities).map((city) => ({
    url: `${baseUrl}/uk/${slugify(city)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // Genre pages (including those without events — harmless, returns notFound)
  const genrePages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/genres/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // City+genre combos — only where a real event exists (prevents thin pages)
  const combos = new Set<string>();
  for (const e of events) {
    if (!e.venue?.city) continue;
    for (const c of e.categories) {
      combos.add(`${slugify(e.venue.city)}/${c.category.slug}`);
    }
  }
  const comboPages: MetadataRoute.Sitemap = Array.from(combos).map((path) => ({
    url: `${baseUrl}/uk/${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.65,
  }));

  void venues;

  return [...staticPages, ...eventPages, ...cityPages, ...genrePages, ...comboPages];
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
