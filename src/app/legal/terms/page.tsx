import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Terms of service',
  description: 'Droptix terms of service for buyers and event organisers.',
};

export default function TermsPage() {
  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <Badge variant="tech" className="mb-4">Legal · Draft</Badge>
      <h1 className="text-display-lg uppercase">Terms of service</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Placeholder &mdash; full terms will be reviewed with counsel before launch marketing.
        Nothing here constitutes legal advice; reach out to support@droptix.co.uk with questions.
      </p>

      <div className="prose prose-invert mt-10 max-w-none">
        <h2>1. Who we are</h2>
        <p>
          Droptix is a ticketing marketplace operated by Droptix Ltd, connecting UK music event
          organisers with ticket buyers. Organisers are the sellers of record for tickets; Droptix
          acts as their payment facilitator via Stripe Connect.
        </p>

        <h2>2. Your tickets</h2>
        <p>
          When you buy a ticket you enter a contract with the event organiser, not Droptix. Each
          ticket is a revocable licence to attend the specified event on the specified date,
          subject to the organiser&rsquo;s and venue&rsquo;s conditions.
        </p>
        <p>
          <strong>Cooling-off period:</strong> Under the Consumer Contracts Regulations 2013 (reg
          28), tickets for events tied to a specific performance date are exempt from the 14-day
          right to cancel. By completing purchase you acknowledge you&rsquo;re waiving this right.
        </p>

        <h2>3. Refunds</h2>
        <p>
          Cancelled events: you&rsquo;ll receive a refund of the face value and any booking fee
          within 7 working days of the cancellation being logged. Postponed events: the original
          ticket remains valid for the rescheduled date unless you contact us within 48 hours of
          the new date being announced.
        </p>

        <h2>4. Organisers</h2>
        <p>
          Organisers agree to a separate Organiser Agreement covering commissions, payouts,
          attendee data handling, and chargeback flow-through. See <a href="/sell/fees">/sell/fees</a>.
        </p>

        <h2>5. Age-restricted events</h2>
        <p>
          Where an event is age-restricted, door staff verify ID on arrival. Purchasing a ticket
          does not guarantee entry if age cannot be proved.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions, complaints, disputes:{' '}
          <a href="mailto:support@droptix.co.uk">support@droptix.co.uk</a>.
        </p>
      </div>
    </main>
  );
}
