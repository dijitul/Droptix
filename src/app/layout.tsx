import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://droptix.co.uk'),
  title: {
    default: 'Droptix — UK tickets for gigs, club nights, comedy & more',
    template: '%s · Droptix',
  },
  description:
    'The UK\'s grassroots ticket marketplace. Lower fees, faster payouts, built for independent events.',
  applicationName: 'Droptix',
  authors: [{ name: 'Droptix' }],
  keywords: ['UK tickets', 'gigs', 'club nights', 'comedy', 'festivals', 'events', 'independent'],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B12' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        {/* Skip link — WCAG 2.4.1 Bypass Blocks */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
