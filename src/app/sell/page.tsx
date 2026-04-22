import Link from 'next/link';
import { Check, Zap, PoundSterling, BarChart3, QrCode, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'For promoters',
  description:
    'Put UK music events on sale with Droptix. Lower fees than Skiddle. Faster payouts than Eventbrite. Scanner PWA for the door.',
};

export default function SellPage() {
  return (
    <main id="main">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-primary/20">
        <div
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 80% 30%, rgb(255 94 7 / 0.4), transparent 60%), radial-gradient(ellipse 60% 40% at 10% 80%, rgb(60 77 0 / 0.6), transparent 60%)',
          }}
          aria-hidden="true"
        />
        <div className="container py-20 md:py-28">
          <Badge variant="hazard" className="mb-6">
            For promoters · UK
          </Badge>
          <h1 className="text-display-xl uppercase max-w-[18ch]">
            Your show,<br />not our margin.
          </h1>
          <p className="mt-6 max-w-prose text-lg text-on-surface-variant">
            Droptix is a ticketing platform built for independent UK music promoters. Lower fees,
            faster payouts, and tooling that actually works on a busy door. Self-serve in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sell/start">Start selling</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sell/fees">See the fees</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Fee comparison */}
      <section className="container py-20">
        <div className="mb-10">
          <div className="label-tech mb-2 text-tertiary">001 · Economics</div>
          <h2 className="text-display-lg uppercase">Maths that adds up</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FeeCard
            label="Droptix"
            fee="5% + £0.50"
            tier1="Free events are free — always."
            tier2="Volume tiers drop to 3.5% + £0.40 over £50k/Q."
            tier3="Per-promoter overrides — call us."
            highlighted
          />
          <FeeCard
            label="Skiddle"
            fee="~12% incl. VAT"
            tier1="Booking fee + card fee."
            tier2="Refunds keep the booking fee."
            tier3="Passed to buyer by default."
          />
          <FeeCard
            label="Eventbrite"
            fee="6.95% + £0.59"
            tier1="Plus per-event organiser fee on paid plans."
            tier2="Funds held until 24h after event."
            tier3="Reserve % withheld as float."
          />
        </div>
      </section>

      {/* Tools */}
      <section className="border-t-2 border-outline-variant bg-surface-container-low py-20">
        <div className="container">
          <div className="mb-10">
            <div className="label-tech mb-2 text-tertiary">002 · Tools</div>
            <h2 className="text-display-lg uppercase">What you get</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={Zap}
              title="Stripe Connect Express"
              body="Onboard in 5 minutes. KYC handled by Stripe. Your money lands in your bank, not ours."
            />
            <Feature
              icon={PoundSterling}
              title="T+7 payouts"
              body="Seven days after event end, funds transfer. Trusted promoters graduate to T+48h."
            />
            <Feature
              icon={BarChart3}
              title="Real-time dashboard"
              body="Tickets sold, revenue, scan rate, sell-through. Works on your phone at the venue."
            />
            <Feature
              icon={QrCode}
              title="Scanner PWA"
              body="Open droptix.co.uk on any staff Android or iPhone, enter a shift PIN, scan tickets offline. Syncs when signal returns."
            />
            <Feature
              icon={ImageIcon}
              title="In-flow image crop"
              body="Upload anything up to 50MB, crop in the browser. We handle resizing and CDN delivery. No 320×230 tickboxes."
            />
            <Feature
              icon={Check}
              title="Tamper-proof tickets"
              body="HMAC-signed QR + backup door code. Tickets can't be forged. Doors can't be crashed."
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container py-20 md:py-28">
        <div className="relative overflow-hidden border-2 border-primary bg-surface-container p-10 md:p-16">
          <div
            className="absolute inset-0 -z-10 opacity-70"
            style={{
              background:
                'radial-gradient(circle at 20% 50%, rgb(171 214 0 / 0.15), transparent 60%)',
            }}
            aria-hidden="true"
          />
          <div className="label-tech mb-3 text-tertiary">Ready?</div>
          <h2 className="text-display-lg uppercase max-w-[16ch]">
            Put your next show<br />on sale tonight.
          </h2>
          <p className="mt-5 max-w-prose text-lg text-on-surface-variant">
            You&rsquo;ll be live in 10 minutes. Stripe handles your payouts. We handle everything else.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sell/start">Start selling</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Organiser sign-in</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeeCard({
  label,
  fee,
  tier1,
  tier2,
  tier3,
  highlighted,
}: {
  label: string;
  fee: string;
  tier1: string;
  tier2: string;
  tier3: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? 'relative border-2 border-primary bg-surface-container p-6 shadow-glow'
          : 'relative border-2 border-outline-variant bg-surface-container p-6 opacity-80'
      }
    >
      <div className="label-tech mb-2 text-tertiary">{label}</div>
      <div className="font-display text-4xl font-bold text-primary">{fee}</div>
      <ul className="mt-6 flex flex-col gap-2 text-sm text-on-surface-variant">
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {tier1}</li>
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {tier2}</li>
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {tier3}</li>
      </ul>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  body: string;
}) {
  return (
    <div className="border-2 border-outline-variant bg-surface-container p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center border-2 border-tertiary/50 text-tertiary">
        <Icon className="h-5 w-5" aria-hidden={true} />
      </div>
      <h3 className="font-display text-lg font-bold uppercase tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
    </div>
  );
}
