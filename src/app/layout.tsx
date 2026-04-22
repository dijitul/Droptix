import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

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

        <SiteHeader />

        <div className="flex-1">{children}</div>

        <SiteFooter />

        <Toaster />
      </body>
    </html>
  );
}
