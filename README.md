# Droptix

The UK's grassroots ticket marketplace. Lower fees, faster payouts, built for independent events.

## Stack

- **Next.js 15** (App Router, RSC, TypeScript, React 19) — SSR-first for SEO
- **Postgres 16** + **Prisma** — `BIGINT` pence everywhere, no floats for money
- **Tailwind CSS** + **shadcn/ui** + **Radix** primitives — accessible by default
- **Stripe Connect** (Express accounts) + **hosted Stripe Checkout**
- **BullMQ** + **Redis** for background jobs
- **Cloudflare R2** (image origin) + **Cloudflare Images** (CDN + resize)
- **Auth.js** (magic-link email)
- **Scanner PWA** via service worker + IndexedDB + Background Sync

## Hosting

- **CyberPanel** on Linux (OpenLiteSpeed), Node.js app manager
- **Cloudflare** in front for CDN, WAF, DDoS
- Node LTS 22

## Local dev

```bash
pnpm install
cp .env.example .env.local
# edit DATABASE_URL, INTEGRATIONS_ENCRYPTION_KEY, etc.
pnpm db:push
pnpm dev
```

Visit `http://localhost:3000`.

## Core invariants (do not violate)

1. **Money is always `bigint` pence + `currency_code`.** Never `parseFloat`, never `number` for pounds. Enforced by ESLint (`no-restricted-syntax`).
2. **Stripe keys live in the admin `integrations` table** (encrypted), not in env. One exception: `INTEGRATIONS_ENCRYPTION_KEY` itself.
3. **Event pages are server-rendered** with JSON-LD `Event` schema. Never client-only.
4. **Webhook is authoritative**, not the success page. Idempotency via `webhook_events.stripe_event_id UNIQUE`.
5. **Ticket QR** = HMAC-signed payload + DB state check. Per-event signing key rotates on event creation.
6. **Fees shown above the Buy CTA**, always. DMCC 2024 compliance + brand story.
7. **British English** everywhere: "organiser" not "organizer", `lang="en-GB"`, `£` prefix, `DD MMM YYYY`.

## Directory

```
droptix-new/
├── prisma/
│   └── schema.prisma         # Postgres schema (BIGINT pence, versioned commission rules)
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (buyer)/          # public discovery + checkout
│   │   ├── (organiser)/      # organiser dashboard
│   │   ├── (admin)/          # platform admin
│   │   ├── (scanner)/        # door PWA
│   │   └── api/              # webhooks, oRPC endpoints
│   ├── lib/
│   │   ├── money.ts          # Money value object
│   │   ├── tokens.css        # design tokens (violet, Geist)
│   │   └── env.ts            # zod-validated env
│   └── server/
│       ├── db.ts             # Prisma client
│       ├── integrations.ts   # encrypted key vault
│       ├── stripe.ts         # Stripe client factory
│       └── auth.ts           # Auth.js magic-link config
└── .github/workflows/
    ├── ci.yml                # typecheck, lint, test, axe, pa11y
    └── deploy.yml            # SSH to CyberPanel, git pull, build, pm2 reload
```

## Licence

Proprietary. © Dijitul Ltd.
