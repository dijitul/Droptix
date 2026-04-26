import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Privacy policy',
  description: 'How Droptix handles your data under UK GDPR.',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <Badge variant="tech" className="mb-4">Legal</Badge>
      <h1 className="text-display-lg uppercase">Privacy policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: <time dateTime="2026-04-23">23 April 2026</time>. Short version: we collect
        the minimum to sell you a ticket, your card details never touch our servers, and we
        don&rsquo;t sell anything to anyone. Data-subject requests:{' '}
        <a href="mailto:privacy@droptix.co.uk" className="text-primary underline">privacy@droptix.co.uk</a>.
      </p>

      <div className="prose prose-invert mt-10 max-w-none">
        <h2>Data controller</h2>
        <p>
          Droptix is the data controller for your account and buyer data. When you book a ticket,
          the event organiser becomes a joint controller for your name, email, ticket type, and
          scan status (only) under UK GDPR Art 26.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Your email address (for sign-in + order confirmations)</li>
          <li>Your name (on tickets)</li>
          <li>Your purchase history (orders + issued tickets)</li>
          <li>Device metadata (IP, user agent, crudely, for fraud prevention)</li>
          <li>Scan events at the door (which device scanned, when)</li>
        </ul>

        <h2>Payment data</h2>
        <p>
          We never see or store your card details. Payments are handled end-to-end by Stripe
          (PCI-DSS Level 1). Droptix is SAQ-A scope.
        </p>

        <h2>Retention</h2>
        <p>
          Order + ticket data: 6 years post-event (tax retention). Buyer profile: until you delete
          the account. Scan logs: 2 years then anonymised.
        </p>

        <h2>Your rights</h2>
        <p>
          Access, rectification, erasure, portability, objection, restriction. We respond within
          one calendar month. To exercise:{' '}
          <a href="mailto:privacy@droptix.co.uk">privacy@droptix.co.uk</a>.
        </p>

        <h2>International transfers</h2>
        <p>
          Stripe processes payments in the US under the UK International Data Transfer Addendum.
          No buyer data is transferred to other jurisdictions.
        </p>

        <h2>Cookies</h2>
        <p>See the <a href="/legal/cookies">cookie notice</a>.</p>
      </div>
    </main>
  );
}
