import type { MetadataRoute } from 'next';
import { db } from '@/server/db';

/**
 * Dynamic sitemap covering homepage, discover, and every on-sale event.
 * Phase 1b will split into an index sharded by city+month once we have
 * more than ~40k URLs. Until then, single flat sitemap is fine.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://droptix.co.uk';

  const events = await db.event.findMany({
    where: { publishedAt: { not: null }, startsAt: { gte: new Date() } },
    select: { slug: true, updatedAt: true },
    take: 10_000,
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/discover`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/sell`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${baseUrl}/events/${e.slug}`,
    lastModified: e.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticPages, ...eventPages];
}
