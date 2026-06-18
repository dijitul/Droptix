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

  // Type + lint errors fail the build by default. CI (.github/workflows/ci.yml)
  // runs `pnpm typecheck` + `pnpm lint` on every push to main, so the on-box
  // production build can safely skip these to save memory on the 2GB VPS —
  // gated behind SKIP_BUILD_CHECKS=1, set only in the CyberPanel deploy step.
  typescript: { ignoreBuildErrors: process.env.SKIP_BUILD_CHECKS === '1' },
  eslint: { ignoreDuringBuilds: process.env.SKIP_BUILD_CHECKS === '1' },
};

export default config;
