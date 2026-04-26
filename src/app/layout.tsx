import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import Script from 'next/script';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

// Google Analytics 4 measurement ID. Hard-coded because the tag is a
// public identifier — it shows up in every page source. If we ever
// need to flip GA off in dev, gate the Script blocks below on
// process.env.NODE_ENV === 'production'.
const GA_MEASUREMENT_ID = 'G-Q1YX84R3T7';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://droptix.co.uk'),
  title: {
    default: 'Droptix — UK music tickets: gigs, club nights, festivals',
    template: '%s · Droptix',
  },
  description:
    'UK tickets for the music scene that actually matters. Gigs, club nights, festivals. Lower fees, faster payouts, no corporate.',
  applicationName: 'Droptix',
  keywords: ['UK gigs', 'club tickets', 'festival tickets', 'live music UK', 'underground electronic', 'rave tickets'],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Droptix',
    url: 'https://droptix.co.uk',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#111508',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark',
};

/** Site-wide structured data — Organization + WebSite. Placed at the root
 *  so every page carries it; per-page JSON-LD (Event, BreadcrumbList etc)
 *  layers on top. */
const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Droptix',
  url: 'https://droptix.co.uk',
  logo: 'https://droptix.co.uk/icon-192.svg',
  description:
    "The UK's grassroots music ticket marketplace. Lower fees, faster payouts, built for independent promoters.",
  sameAs: [],
  areaServed: { '@type': 'Country', name: 'United Kingdom' },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@droptix.co.uk',
      areaServed: 'GB',
      availableLanguage: ['English'],
    },
  ],
};

const WEBSITE_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Droptix',
  url: 'https://droptix.co.uk',
  inLanguage: 'en-GB',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://droptix.co.uk/discover?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-GB"
      className={`dark ${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Skip link — WCAG 2.4.1 */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:font-semibold"
        >
          Skip to main content
        </a>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_LD).replace(/</g, '\\u003c') }}
        />

        <SiteHeader />

        <div className="flex-1">{children}</div>

        <SiteFooter />

        <Toaster />

        {/* Google Analytics 4 — afterInteractive so it never blocks
            paint. Two <Script> blocks: one to load gtag.js, one to
            initialise the dataLayer + config. dangerouslySetInnerHTML
            on the second block matches the snippet GA gives you. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
