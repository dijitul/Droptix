# Getting started (local dev)

## Prereqs

- Node LTS 22 (use [fnm](https://github.com/Schniz/fnm) or nvm with `.nvmrc`)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker (for local Postgres + Redis) — or install them directly

## First run

```bash
git clone git@github.com:dijitul/Droptix.git
cd Droptix
pnpm install

# start Postgres + Redis locally
docker compose up -d

# set up env
cp .env.example .env.local
# edit .env.local — generate secrets:
#   openssl rand -base64 32   # AUTH_SECRET
#   openssl rand -base64 32   # INTEGRATIONS_ENCRYPTION_KEY

pnpm db:push       # push schema (dev only — use migrate for prod)
pnpm db:seed       # platform default commission, categories, flags
pnpm dev
```

Visit `http://localhost:3000`.

## Common tasks

```bash
pnpm dev              # dev server with Turbopack
pnpm lint             # eslint + money-rule check
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest (Money + commission + ticket-signing)
pnpm test:e2e         # playwright (needs dev server up)
pnpm test:a11y        # pa11y-ci
pnpm db:studio        # Prisma Studio GUI
pnpm db:migrate       # generate a new migration
pnpm format           # prettier
```

## Adding a new integration key (Stripe, Postmark, etc.)

Two paths — dev vs admin UI:

**Dev convenience** — drop into `.env.local`:

```
DROPTIX_INTEGRATION_STRIPE_SECRET_KEY=sk_test_...
DROPTIX_INTEGRATION_STRIPE_PUBLISHABLE_KEY=pk_test_...
DROPTIX_INTEGRATION_STRIPE_WEBHOOK_SECRET=whsec_...
```

The `getIntegration()` helper checks env first, then DB.

**Production path** — admin panel under `/admin/integrations` (built in Phase 3). Values are AES-256-GCM encrypted at rest using `INTEGRATIONS_ENCRYPTION_KEY`.

## Troubleshooting

- **`Environment validation failed`** at boot: something in `.env.local` is missing or malformed. `src/lib/env.ts` lists the required shape.
- **Prisma client errors after schema edit**: run `pnpm db:generate`.
- **Playwright browser missing**: `pnpm exec playwright install --with-deps chromium`.
