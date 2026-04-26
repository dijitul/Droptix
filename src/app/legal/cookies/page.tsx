import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { CookieResetButton } from '@/components/cookie-banner';

export const metadata = {
  title: 'Cookie notice',
  description: 'Which cookies Droptix sets and why.',
  alternates: { canonical: '/legal/cookies' },
};

export default function CookiesPage() {
  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <Badge variant="tech" className="mb-4">Legal</Badge>
      <h1 className="text-display-lg uppercase">Cookies</h1>

      <div className="prose prose-invert mt-10 max-w-none">
        <p>
          Droptix uses two kinds of cookies: a small set that&rsquo;s strictly necessary to keep
          you signed in and prevent CSRF, and Google Analytics 4 to count visits. Analytics is
          off by default &mdash; we ask before we set it.
        </p>

        <h2>Strictly necessary (always on)</h2>
        <p>
          These don&rsquo;t need consent under PECR / UK GDPR Recital 32 because the service
          can&rsquo;t function without them.
        </p>
        <ul>
          <li>
            <code>__Secure-authjs.session-token</code> &mdash; keeps you signed in after you log
            in via magic link. Expires after 30 days of inactivity.
          </li>
          <li>
            <code>authjs.csrf-token</code> &mdash; anti-CSRF protection on sign-in form.
          </li>
          <li>
            <code>authjs.callback-url</code> &mdash; where to send you after sign-in succeeds.
          </li>
          <li>
            <code>droptix_consent</code> &mdash; remembers your cookie choice (granted or denied)
            so we don&rsquo;t nag you on every page. <em>localStorage</em>, not a cookie strictly,
            but listed here for transparency.
          </li>
        </ul>

        <h2>Analytics (only with consent)</h2>
        <p>
          We use Google Analytics 4 (measurement ID <code>G-Q1YX84R3T7</code>) to count visits and
          understand which events get the most attention. We use the data in aggregate &mdash; we
          don&rsquo;t identify individual visitors, we don&rsquo;t share it with advertisers, and
          we run with Google Consent Mode v2 set to <em>denied</em> by default.
        </p>
        <ul>
          <li>
            <code>_ga</code>, <code>_ga_Q1YX84R3T7</code> &mdash; only set after you click
            &ldquo;Accept&rdquo; on the cookie banner. Expires after 2 years.
          </li>
        </ul>

        <h2>Change your mind</h2>
        <p>
          You can update your choice any time:{' '}
          <CookieResetButton>
            <span className="text-primary underline underline-offset-2">re-open the cookie banner</span>
          </CookieResetButton>
          . Or clear cookies for droptix.co.uk in your browser settings &mdash; the banner will
          reappear on your next visit.
        </p>

        <p>
          Read the full{' '}
          <Link href="/legal/privacy" className="text-primary underline underline-offset-2">
            privacy policy
          </Link>
          {' '}for what we do with your data beyond cookies.
        </p>
      </div>
    </main>
  );
}
