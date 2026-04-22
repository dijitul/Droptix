import type { MetadataRoute } from 'next';

/**
 * PWA manifest. Scanner-specific manifest lives at /(scanner)/manifest.ts
 * so the door staff install a standalone scanner app, not the buyer site.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Droptix',
    short_name: 'Droptix',
    description: 'UK music tickets — gigs, club nights, festivals',
    start_url: '/',
    display: 'standalone',
    background_color: '#111508',
    theme_color: '#abd600',
    lang: 'en-GB',
    orientation: 'any',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
