import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Cookie notice',
  description: 'Which cookies Droptix sets and why.',
};

export default function CookiesPage() {
  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <Badge variant="tech" className="mb-4">Legal</Badge>
      <h1 className="text-display-lg uppercase">Cookies</h1>

      <div className="prose prose-invert mt-10 max-w-none">
        <p>
          Droptix uses essential cookies only. No ad tech, no third-party trackers, no consent
          banner needed under PECR for the set below.
        </p>

        <h2>Essential cookies</h2>
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
        </ul>

        <p>
          If we ever add analytics or marketing cookies, we&rsquo;ll put a properly-designed
          consent gate in place first (Reject All equally prominent, full granular controls).
        </p>
      </div>
    </main>
  );
}
