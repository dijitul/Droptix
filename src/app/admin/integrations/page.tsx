import { db } from '@/server/db';
import { setIntegration } from '@/server/integrations';
import { requireAdmin } from '@/server/guards';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';
import type { IntegrationProvider } from '@prisma/client';

export const metadata = { title: 'Integrations' };
export const dynamic = 'force-dynamic';

type KeyField = {
  name: string;
  label: string;
  placeholder?: string;
  optional?: boolean;
};

type ProviderDef = {
  provider: IntegrationProvider;
  label: string;
  description: string;
  docsUrl: string;
  keys: KeyField[];
};

const PROVIDERS: ProviderDef[] = [
  {
    provider: 'STRIPE',
    label: 'Stripe',
    description: 'Card payments via hosted Stripe Checkout + Connect for organiser payouts.',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    keys: [
      { name: 'publishable_key', label: 'Publishable key', placeholder: 'pk_live_… or pk_test_…' },
      { name: 'secret_key', label: 'Secret key', placeholder: 'sk_live_… or sk_test_…' },
      { name: 'webhook_secret', label: 'Webhook signing secret', placeholder: 'whsec_…' },
    ],
  },
  {
    provider: 'MAILGUN',
    label: 'Mailgun (EU)',
    description: 'Transactional email (magic links, order confirmations, ticket delivery). EU region endpoint: api.eu.mailgun.net.',
    docsUrl: 'https://app.eu.mailgun.com/app/sending/domains',
    keys: [
      { name: 'api_key', label: 'API key (Private)', placeholder: 'key-…   (from Domain → API keys → Private API key)' },
      { name: 'domain', label: 'Sending domain', placeholder: 'mg.droptix.co.uk — the verified sending domain' },
      { name: 'from_email', label: 'From email', placeholder: 'tickets@droptix.co.uk' },
      { name: 'from_name', label: 'From name', placeholder: 'Droptix' },
    ],
  },
  {
    provider: 'CLOUDFLARE_R2',
    label: 'Cloudflare R2',
    description: 'Image storage (hero/gallery) — origin for Cloudflare Images CDN.',
    docsUrl: 'https://dash.cloudflare.com/?to=/:account/r2/api-tokens',
    keys: [
      { name: 'account_id', label: 'Account ID' },
      { name: 'access_key_id', label: 'Access key ID' },
      { name: 'secret_access_key', label: 'Secret access key' },
      { name: 'bucket', label: 'Bucket name', placeholder: 'droptix-images' },
    ],
  },
  {
    provider: 'CLOUDFLARE_IMAGES',
    label: 'Cloudflare Images',
    description: 'On-demand image resizing / WebP / AVIF delivery.',
    docsUrl: 'https://dash.cloudflare.com/?to=/:account/images',
    keys: [
      { name: 'account_hash', label: 'Account hash' },
      { name: 'api_token', label: 'API token' },
    ],
  },
  {
    provider: 'HCAPTCHA',
    label: 'hCaptcha / Turnstile',
    description: 'Bot mitigation on checkout & signup.',
    docsUrl: 'https://dash.cloudflare.com/?to=/:account/turnstile',
    keys: [
      { name: 'site_key', label: 'Site key (public)' },
      { name: 'secret_key', label: 'Secret key' },
    ],
  },
  {
    provider: 'SENTRY',
    label: 'Sentry',
    description: 'Error monitoring (optional but strongly recommended).',
    docsUrl: 'https://sentry.io/settings/projects/',
    keys: [{ name: 'dsn', label: 'Project DSN', optional: true }],
  },
];

async function savePath(formData: FormData) {
  'use server';
  const admin = await requireAdmin();
  const provider = String(formData.get('provider') ?? '') as IntegrationProvider;
  const keyName = String(formData.get('keyName') ?? '');
  const value = String(formData.get('value') ?? '').trim();
  if (!provider || !keyName || !value) return;
  await setIntegration({ provider, keyName, plaintextValue: value, adminId: admin.id });
  revalidatePath('/admin/integrations');
}

export default async function IntegrationsPage() {
  await requireAdmin();

  const existing = await db.integration.findMany({
    select: { provider: true, keyName: true, updatedAt: true, environment: true },
  });
  const configured = new Set(existing.map((e) => `${e.provider}:${e.keyName}`));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          All API keys live here, encrypted at rest. Rotate anytime &mdash; no redeploy required.
        </p>
      </header>

      {PROVIDERS.map((p) => {
        const hasAllRequired = p.keys.every(
          (k) => k.optional || configured.has(`${p.provider}:${k.name}`),
        );
        return (
          <Card key={p.provider}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {p.label}
                    {hasAllRequired ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Circle className="h-3 w-3" aria-hidden="true" />
                        Not set
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">{p.description}</CardDescription>
                </div>
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm text-primary underline"
                >
                  Get keys ↗
                </a>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {p.keys.map((k) => {
                const existingEntry = existing.find(
                  (e) => e.provider === p.provider && e.keyName === k.name,
                );
                return (
                  <form
                    key={k.name}
                    action={savePath}
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="provider" value={p.provider} />
                    <input type="hidden" name="keyName" value={k.name} />
                    <div className="flex-1">
                      <Label htmlFor={`${p.provider}-${k.name}`}>
                        {k.label}
                        {k.optional && (
                          <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                        )}
                      </Label>
                      <Input
                        id={`${p.provider}-${k.name}`}
                        name="value"
                        type={k.name.toLowerCase().includes('token') || k.name.toLowerCase().includes('secret') || k.name.toLowerCase().includes('key') ? 'password' : 'text'}
                        autoComplete="off"
                        placeholder={
                          existingEntry
                            ? `•••••••• (set ${existingEntry.updatedAt.toLocaleDateString('en-GB')})`
                            : k.placeholder
                        }
                      />
                    </div>
                    <Button type="submit" variant="outline">
                      {existingEntry ? 'Replace' : 'Save'}
                    </Button>
                  </form>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
