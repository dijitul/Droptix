import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Support',
  description: 'Get help with your Droptix tickets or event.',
};

export default function SupportPage() {
  return (
    <main id="main" className="container max-w-3xl py-12 sm:py-16">
      <Badge variant="tech" className="mb-4">Help desk</Badge>
      <h1 className="text-display-lg uppercase">Need a hand?</h1>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card title="I bought a ticket" email="tickets@droptix.co.uk">
          Missing tickets, refund requests, name-on-ticket changes, transfer questions.
        </Card>
        <Card title="I run events" email="organisers@droptix.co.uk">
          Stripe Connect, payouts, commission rules, scanner crew access.
        </Card>
        <Card title="Press / partnerships" email="press@droptix.co.uk">
          Editorial, venue listings, data licensing, platform integrations.
        </Card>
        <Card title="Accessibility" email="accessibility@droptix.co.uk">
          Report a barrier &mdash; we&rsquo;ll respond within 2 working days.
        </Card>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Event-night emergency? The <strong>door staff</strong> and <strong>organiser</strong> on
        the night are always fastest. Droptix can re-issue tickets or investigate disputes after
        the event.
      </p>
    </main>
  );
}

function Card({
  title,
  email,
  children,
}: {
  title: string;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-outline-variant bg-surface-container p-5">
      <div className="label-tech mb-2 text-tertiary">{title}</div>
      <p className="text-on-surface-variant">{children}</p>
      <a href={`mailto:${email}`} className="mt-4 inline-block font-display font-bold text-primary hover:underline">
        {email} →
      </a>
    </div>
  );
}
