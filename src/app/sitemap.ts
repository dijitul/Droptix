import type { MetadataRoute } from 'next';

/**
 * Placeholder sitemap — Phase 1 expands to a dynamic index split
 * by city + month, each referencing /events/{slug}-{id} routes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://droptix.co.uk';
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/discover`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/sell`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];
}
