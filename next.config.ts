import type { NextConfig } from 'next';

const config: NextConfig = {
  // CyberPanel / OpenLiteSpeed deploy target — emits a minimal Node server
  // under .next/standalone that we can run directly via `node server.js`.
  output: 'standalone',

  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // UK English + canonical redirects
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Language', value: 'en-GB' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), payment=(self)' },
        ],
      },
    ];
  },

  images: {
    // We proxy image transforms through Cloudflare Images; keep the Next loader
    // pointed at our CDN hostname so the `<Image>` component stays idiomatic.
    remotePatterns: [
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.droptix.co.uk' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'react-hook-form'],
    serverActions: {
      bodySizeLimit: '50mb', // raw image uploads — resized downstream
    },
  },

  // Fail the build on type errors in CI rather than at runtime
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default config;
