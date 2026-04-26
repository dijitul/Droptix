import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'About',
  description: 'Why Droptix exists and who it\u2019s for.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <Badge variant="tech" className="mb-4">About</Badge>
      <h1 className="text-display-lg uppercase">We&rsquo;re tired of paying 12% to a queue page.</h1>

      <div className="prose prose-invert mt-10 max-w-none">
        <p className="lead text-lg">
          Droptix is a UK music ticketing platform built by people who still go to 200-cap gigs
          and 4am warehouse sets. We started it because the incumbents &mdash; Ticketmaster,
          Skiddle, Fatsoma, Eventbrite &mdash; take too much, pay too slow, and treat independent
          promoters like an afterthought.
        </p>

        <h2>What&rsquo;s different</h2>
        <ul>
          <li>
            <strong>5% + £0.50</strong>, not 12% + VAT. Volume tiers drop lower. Per-organiser overrides.
          </li>
          <li>
            <strong>T+7 payouts</strong>, not 30 days. Faster for trusted promoters.
          </li>
          <li>
            <strong>Self-serve Stripe Connect.</strong> No sales calls. Your money, your bank.
          </li>
          <li>
            <strong>Scanner PWA</strong> that works on any staff phone. Offline-ready.
          </li>
          <li>
            <strong>Music only.</strong> No comedy, no quiz nights. Built around gigs, clubs,
            festivals &mdash; the rooms that pay the rent for the scene.
          </li>
        </ul>

        <h2>Who&rsquo;s behind it</h2>
        <p>
          A small independent team based in the UK, building in the open. We&rsquo;re hiring.
          Email <a href="mailto:hello@droptix.co.uk">hello@droptix.co.uk</a>.
        </p>
      </div>
    </main>
  );
}
