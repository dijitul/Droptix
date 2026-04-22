import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Accessibility',
  description: 'Droptix accessibility commitments and known issues.',
};

export default function AccessibilityPage() {
  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <Badge variant="tech" className="mb-4">Accessibility statement</Badge>
      <h1 className="text-display-lg uppercase">Built for everyone</h1>

      <div className="prose prose-invert mt-10 max-w-none">
        <h2>Standard</h2>
        <p>
          Droptix is designed to meet <strong>WCAG 2.2 AA</strong>. We run axe-core + Pa11y on
          every deploy, and test keyboard-only, NVDA + Firefox, VoiceOver + iOS Safari, and
          TalkBack + Android Chrome on every release.
        </p>

        <h2>What&rsquo;s working</h2>
        <ul>
          <li>Keyboard-navigable across the whole site</li>
          <li>Visible focus ring on every interactive element (2px lime, 3:1 contrast)</li>
          <li>Minimum tap targets of 44×44 px on mobile</li>
          <li>Semantic landmarks, breadcrumbs, skip-link to main content</li>
          <li>Colour-independent status (every coloured chip has an icon or text label)</li>
          <li>Respects <code>prefers-reduced-motion</code></li>
          <li>Screen-reader-friendly currency and date formatting</li>
          <li>Scanner announces scan results via <code>aria-live="assertive"</code></li>
          <li>Magic-link sign-in (no CAPTCHA cognitive puzzles)</li>
        </ul>

        <h2>Known issues</h2>
        <ul>
          <li>
            Scanner&rsquo;s manual door-code fallback UI is stubbed &mdash; camera-first workflow
            only for now.
          </li>
          <li>
            Seat-map drag alternative lands with the reserved-seating feature in a later phase.
          </li>
        </ul>

        <h2>Report a barrier</h2>
        <p>
          If something&rsquo;s blocking you, email{' '}
          <a href="mailto:accessibility@droptix.co.uk">accessibility@droptix.co.uk</a>. We&rsquo;ll
          fix it and update this page.
        </p>

        <h2>Legal position</h2>
        <p>
          Droptix is committed to reasonable adjustments under the Equality Act 2010. This page
          is reviewed quarterly.
        </p>
      </div>
    </main>
  );
}
