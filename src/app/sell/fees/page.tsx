import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Fees & payouts',
  description: "Droptix's transparent fee structure for UK music promoters. 5% + £0.50, nothing hidden.",
};

export default function FeesPage() {
  return (
    <main id="main" className="container py-16">
      <Badge variant="tech" className="mb-4">Fees · Transparent</Badge>
      <h1 className="text-display-lg uppercase">Our cut, our maths, in the open.</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <Section heading="Standard rate">
            <p>
              <strong className="text-primary">5% + £0.50 per ticket</strong>, passed to the buyer by
              default. Free events are always free.
            </p>
            <p>
              Organisers can choose to absorb the fee so punters pay face value. The fee structure is
              quoted server-side at the Stripe Checkout session — the buyer sees the breakdown above
              the pay button, every time.
            </p>
          </Section>

          <Section heading="Volume tiers">
            <p>
              Promoters processing over <strong className="text-primary">£50,000 GMV per quarter</strong>{' '}
              automatically drop to <strong className="text-primary">3.5% + £0.40</strong>. No
              negotiation, no paperwork, no "contact sales". The admin applies the lower rule and it
              takes effect next session.
            </p>
          </Section>

          <Section heading="Stripe's slice">
            <p>
              Stripe&rsquo;s standard card fee applies on top of our platform fee:{' '}
              <strong>1.5% + 20p</strong> for UK cards, 2.5% for international. That&rsquo;s taken by
              Stripe directly from the charge — we don&rsquo;t touch it.
            </p>
          </Section>

          <Section heading="Payouts">
            <p>
              <strong className="text-primary">T+7 days</strong> from event end by default. Stripe
              transfers to your connected bank account (1–2 business days to clear).
            </p>
            <p>
              After <strong>3 successful events</strong>, trusted promoters can switch to{' '}
              <strong className="text-primary">T+48h</strong>. Optional instant payouts available on
              request at a slightly higher commission to cover chargeback risk.
            </p>
          </Section>

          <Section heading="Refunds & chargebacks">
            <p>
              We reverse our platform fee in full on any refund. The Stripe card fee is
              non-refundable (Stripe&rsquo;s policy). Chargebacks are Stripe-managed with evidence
              drawn from our scan logs + device fingerprints.
            </p>
            <p>
              For cancelled events, refunds flow through automatically within 24h of the organiser
              marking the event cancelled.
            </p>
          </Section>

          <Section heading="What we don&rsquo;t charge">
            <ul className="list-inside list-[square] text-on-surface-variant">
              <li>Listing fees</li>
              <li>Monthly subscriptions</li>
              <li>Per-event publishing fees</li>
              <li>Storage / bandwidth for your images</li>
              <li>Support calls</li>
            </ul>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-2 border-primary bg-surface-container p-6 shadow-glow">
            <div className="label-tech mb-3 text-tertiary">Example · £15 ticket</div>
            <dl className="space-y-2 text-sm">
              <Row dt="Face value" dd="£15.00" />
              <Row dt="Platform fee (5%)" dd="£0.75" />
              <Row dt="Fixed fee" dd="£0.50" />
              <div className="my-2 border-t border-outline-variant" />
              <Row dt="Buyer pays" dd="£16.25" bold />
              <Row dt="Stripe card fee" dd="-£0.44" />
              <Row dt="Organiser receives" dd="£14.56" highlight />
            </dl>
            <Button asChild className="mt-6 w-full">
              <Link href="/sell/start">Start selling</Link>
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-outline-variant py-8 first:pt-0">
      <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-tight">{heading}</h2>
      <div className="flex flex-col gap-3 text-on-surface-variant">{children}</div>
    </section>
  );
}

function Row({
  dt,
  dd,
  bold,
  highlight,
}: {
  dt: string;
  dd: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={highlight ? 'label-tech text-primary' : 'text-muted-foreground'}>{dt}</dt>
      <dd
        className={
          highlight
            ? 'font-display font-bold text-primary'
            : bold
            ? 'font-display font-bold'
            : ''
        }
      >
        {dd}
      </dd>
    </div>
  );
}
