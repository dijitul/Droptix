# Droptix — Claude context

This file primes any Claude session working on this repo. Read top-to-bottom before touching code.

## What is this

**Droptix** is a **UK-focused music ticket marketplace** (scope: music only — gigs, club nights, festivals). The wedge vs Skiddle/Fatsoma/DICE/Eventbrite is **lower configurable fees + organiser-first tooling + UK-native brutalist aesthetic**.

This repo is a **full greenfield rewrite** of a purchased Laravel 9 script that had architectural problems (floats for money, global-only commission, forgeable QR payloads, no image crop). The legacy code stays read-only on the server at `public_html.laravel-backup-*` for data-migration reference.

## Status — LIVE on [droptix.co.uk](https://droptix.co.uk)

Production deploy landed 2026-04-22. Site is responding; homepage, `/discover`, `/events/[slug]`, `/api/health` all green. Buyer checkout is wired end-to-end *in code* but won't actually transact until the owner enters Stripe + Postmark + R2 keys via `/admin/integrations`. See `/root/droptix-handoff.txt` on the server (142.93.40.130, chmod 600) for the next-steps runbook.

## Stack (do not change without discussion)

| Layer | Choice | Why |
|---|---|---|
| Frontend + SSR | Next.js 15 App Router + React 19 + TypeScript | SEO (JSON-LD Event, CWV < 2.5s), PWA scanner |
| Styling | Tailwind + shadcn/ui + Radix | Accessible by default (WCAG 2.2 AA baked in) |
| DB | **MariaDB 10.11** via Prisma `mysql` provider | Reuses legacy's existing MariaDB server; accepted trade-offs: no citext, no partial unique indexes, no JSONB |
| API | Server actions + REST route handlers for webhooks | oRPC deferred until scanner PWA needs it |
| Auth | Auth.js v5 magic-link email | No passwords, WCAG 3.3.8 |
| Payments | Stripe Connect Express + hosted Checkout | PCI SAQ-A scope; per-organiser payouts |
| Jobs | BullMQ + Redis | Email send, webhook retry, image resize, scan reconcile |
| Storage | Cloudflare R2 (origin) + Cloudflare Images (CDN) | No egress fees, on-demand variants |
| Email | **SMTP2GO** (HTTP send API) | Transactional only; API key in `Integration` table. Email provider history: Postmark → Mailgun → SMTP2GO (Mailgun closed the account) |
| Deploy | **CyberPanel on a 2GB VPS** + Cloudflare front | Not Vercel — user's existing infra |
| Process manager | PM2 (1 fork web + 1 fork worker) | Memory ceiling: web 600MB, worker 384MB |

## Hard invariants — DO NOT violate

1. **Money is always `bigint` pence + `currency_code`.** Never `parseFloat`, never `number` for pounds. Enforced by ESLint (`no-restricted-syntax`) in `eslint.config.mjs`. The `Money` value object at [`src/lib/money.ts`](src/lib/money.ts) is the only place floats appear, and only at the major/minor boundary.

2. **Stripe / Postmark / R2 keys live in the `Integration` DB table** (AES-256-GCM encrypted), not in env. Rotated via `/admin/integrations`. The one irreducible env secret is `INTEGRATIONS_ENCRYPTION_KEY`.

3. **Event pages are server-rendered** with JSON-LD `Event` + `Offer` + `Place` + `Organization` + `BreadcrumbList`. Never client-only rendering on event routes.

4. **Stripe webhook is authoritative**, never the success page. Idempotency via `WebhookEvent.externalId` unique constraint.

5. **Ticket QR** = HMAC-signed payload (per-event signing key) + DB state check. Never trust client-side verification alone.

6. **Fees shown above the Buy CTA**, always. DMCC Act 2024 drip-pricing compliance + brand story.

7. **British English**: `"organiser"` not `"organizer"`, `lang="en-GB"`, `£` prefix, `"Fri 7 Nov · 8:00pm"` format.

8. **Don't modify the legacy Laravel code** at `C:\Users\Olly\Git\Droptix` (local) or `/home/droptix.co.uk/public_html.laravel-backup-*` (server). Reference only, for eventual data migration.

## Production server quick reference

- **Host**: `142.93.40.130` (Ubuntu 24.04, CyberPanel 2.4, 2 CPU, 2GB RAM)
- **App dir**: `/home/droptix.co.uk/apps/droptix` (owned by `dropt9225`)
- **DB**: `mysql://droptix_app@127.0.0.1:3306/droptix_new`
- **PM2 processes**: `droptix` (web on 127.0.0.1:3001) + `droptix-worker`
- **LSWS vhost config**: `/usr/local/lsws/conf/vhosts/droptix.co.uk/vhost.conf` — proxies `/` to 127.0.0.1:3001. If CyberPanel's UI regenerates this file, the backup is next to it.
- **Secrets file**: `/root/droptix-handoff.txt` (chmod 600)
- **Auto-deploy**: push to `main` → GitHub Actions SSHes in via the ed25519 key at `/home/droptix.co.uk/.ssh/droptix_deploy` (secrets already set up on server; still to be pasted into GitHub Actions)

## Repo map

```
droptix/
├── prisma/
│   ├── schema.prisma                      # 25 models, BigInt pence, versioned commission rules
│   └── seed.ts                            # Platform default + 8 categories + 3 demo events
├── src/
│   ├── app/                               # Next.js App Router (route groups not used yet)
│   │   ├── page.tsx                       # Homepage with "Coming up" grid
│   │   ├── discover/                      # Full event feed
│   │   ├── events/[slug]/                 # Event detail + CheckoutForm (server action)
│   │   ├── orders/[reference]/confirmed/  # Post-Stripe success page
│   │   ├── tickets/[id]/                  # Digital ticket with QR + door code
│   │   ├── account/tickets/               # "My tickets" (magic-link gated)
│   │   ├── admin/                         # Admin shell + /admin/integrations
│   │   ├── login/                         # Magic-link request + check-email + error
│   │   └── api/
│   │       ├── health/route.ts            # DB probe for Cloudflare
│   │       ├── auth/[...nextauth]/        # Auth.js handler
│   │       └── webhooks/stripe/route.ts   # Signature-verified + idempotent
│   ├── components/
│   │   ├── ui/                            # shadcn-derived: button, input, label,
│   │   │                                  # card, badge, separator, radio-group, toaster
│   │   └── event-card.tsx
│   ├── lib/
│   │   ├── money.ts                       # Money value object — canonical path
│   │   ├── commission.ts                  # calculateFees() — server-authoritative
│   │   ├── ticket-signing.ts              # HMAC QR + door-code generator
│   │   ├── seo.ts                         # JSON-LD builders (Event, BreadcrumbList)
│   │   ├── format.ts                      # UK date/time/£ formatters
│   │   └── env.ts                         # Zod-validated env
│   └── server/
│       ├── db.ts                          # Singleton Prisma
│       ├── auth.ts                        # Auth.js v5 magic-link
│       ├── integrations.ts                # Encrypted key vault
│       ├── stripe.ts                      # Client factory via vault
│       ├── mail.ts                        # SMTP2GO HTTP API → sendmail → console fallback
│       ├── r2.ts                          # Presigned R2 URLs
│       ├── queue.ts                       # BullMQ factory
│       ├── rate-limit.ts                  # Redis sliding window
│       ├── guards.ts                      # requireUser / requireAdmin / etc.
│       ├── checkout.ts                    # createCheckoutSession server action
│       ├── ticket-issuance.ts             # Idempotent PAID → issue tickets
│       ├── emails/order-confirmation.ts
│       └── workers/index.ts               # BullMQ worker entrypoint (runs as PM2 app #2)
├── scripts/
│   └── promote-admin.ts                   # pnpm admin:promote <email>
├── docs/
│   ├── deploy-cyberpanel.md
│   ├── deploy-secrets-setup.md
│   ├── getting-started.md
│   └── phase-roadmap.md
├── .github/workflows/
│   ├── ci.yml                             # lint + typecheck + vitest + Playwright axe + pa11y
│   └── deploy.yml                         # SSH → pull → build → pm2 reload
└── ecosystem.config.cjs                   # PM2 — web (port 3001) + worker
```

## Build / typecheck / lint

```bash
pnpm install              # no --frozen-lockfile until lockfile committed
pnpm db:generate          # after schema changes
pnpm db:push              # dev only — prod uses migrations once volume justifies it
pnpm db:seed              # demo data
pnpm build                # NODE_OPTIONS=--max-old-space-size=1280 on the 2GB box
pnpm lint                 # max-warnings=0 — money rule is an error
pnpm typecheck
pnpm test                 # vitest for lib/
pnpm test:e2e             # Playwright + axe
```

## Phase roadmap

- ✅ **Phase 0** (a,b,c) — scaffold, schema, auth, Stripe/Postmark/R2 clients, admin shell + integrations panel
- ✅ **Phase 1a** — buyer checkout vertical end-to-end (live + verified)
- ✅ **Phase 1b** — brand rebrand (Overdrive Industrial), nav/footer, music-only scope, /cities + /uk/[city] + /uk/[city]/[category] + /genres + /genres/[slug] hubs, /sell + /sell/fees landing, 404, enriched sitemap
- ✅ **Phase 2** — organiser side: /sell/start + /organiser layout + dashboard + Stripe Connect Express onboarding + event CRUD + in-browser image crop + attendees + CSV export + door scanner PWA (first-scan-wins via row-locked tx)
- ✅ **Phase 2.1** — Mailgun EU swapped in for Postmark; admin venue + city CRUD; org admin user management; admin events list with cancel/delete
- ✅ **Phase 2.2** — local filesystem image storage (R2 optional, swappable); /api/images route streams via Node; in-flow crop → upload tokens on globalThis (server-action ↔ route-handler bridge)
- ✅ **Phase 2.3** — error boundaries everywhere (organiser/admin/sell/account/root) + ServerActionForm wrapper that toasts errors + preserves form state
- ✅ **Phase 2.4** — site-wide JSON-LD (Organization, WebSite + SearchAction); robots/sitemap fixes; legal page polish; mobile menu wired correctly
- ✅ **Phase 2.5** — fine-tooth-comb audit (UX, mobile, DB, copy specialists in parallel) + DB index batch (Order, Event, Ticket, ScanEvent, WebhookEvent composite indexes for hot paths) + datetime-local parsed as Europe/London (BST/GMT bug fix) + clickable organiser/venue from event cards + heroImage thumbnails on cards + commission preview uses actual organiser rule
- 🔜 **Phase 1c** — Apple Wallet + Google Wallet pass generation (needs Apple cert + Google service account)
- 🔜 **Phase 2c** — scanner service worker + IndexedDB offline sync, scanner crew PIN flow, manual door-code fallback
- 🔜 **Phase 2d** — Tonight / This-weekend filters on /discover; programmatic city×genre routes; event hero `<img>` → next/image with srcset
- 🔜 **Phase 3** — full admin (payout/dispute queue, platform KPIs, audit viewer); waitlists; Verified Organiser badge
- 🔜 **Phase 4** — SEO moat, a11y audit, load test, security review, legal review, Skiddle/Fatsoma CSV importer

## Design system — Overdrive Industrial

High-contrast brutalist on a near-black olive (`#111508`) background:
- **Primary** = Electric Lime `#abd600` (hover `#c3f400`)
- **Secondary** = Hazard Orange `#ff5e07`
- **Tertiary** = Vibrant Cyan `#7df4ff` (tech labels, categories, cursors)
- **Type**: Space Grotesk (display, tight uppercase) + Inter (body). Via `next/font/google`.
- **Shape**: sharp, max 4px radius. No `rounded-xl` / `rounded-2xl` / `rounded-full` except true circles.
- **Depth**: tonal layering (`bg-surface-container-high` etc), NEVER traditional shadows. `shadow-glow` only for active-ticket lime bloom.
- **Signature motifs**: `.hazard-stripe`, `.tech-divider`, `label-tech` uppercase letter-spaced labels, noise-grain body background.
- **Button default** = solid lime, ink text, 2px border, Space Grotesk uppercase.

## Tripping hazards I already hit (don't re-litigate)

- **Port 3000** is taken by CyberPanel's nghttpx. Web runs on **3001**.
- **OLS vhost.conf needs `docRoot` at top**. Without it: "missing <docRoot>" error at parse time.
- **Memory is tight**: 2GB RAM + 2GB emergency swap (at `/swapfile2`). PM2 cluster mode will OOM. Single fork only. Build with `NODE_OPTIONS=--max-old-space-size=1280`.
- **pnpm on fresh corepack**: first run downloads the version pinned in `package.json#packageManager` (9.12.0). Outside the project dir it picks latest.
- **Stripe SDK apiVersion** must match the SDK's supported version literal (currently `'2025-02-24.acacia'`). Updating the SDK may require updating this.
- **Auth.js User type** in `signIn` event doesn't expose `emailVerified` — query DB.
- **Postmark TrackLinks** uses `Models.LinkTrackingOptions.None` enum, not the string `'None'`.
- **`jsx-a11y/label-has-associated-control`** can't trace `<label>{labelProp}</label>` through a wrapper component — add `aria-label` + scoped `eslint-disable-next-line`.
- **Tailwind opacity on CSS-var colours**: values must be space-separated RGB triplets (`171 214 0`, not `#abd600`) so `bg-primary/60` works.
- **Next.js standalone output**: after each build, copy `public/` and `.next/static/` into `.next/standalone/` before PM2 reload or static assets 404.
- **BullMQ worker ESM hoist**: imports hoist before inline code, so `@/lib/env` validates before any inline env-loader runs. The worker imports `./load-env` first — a zero-import side-effect module.
- **First-scan-wins on MariaDB**: no partial unique indexes. `src/server/scanning.ts` uses `SELECT ... FOR UPDATE` inside a tx to serialise concurrent scans. Don't regress to app-only checks.
- **OLS vhost proxy**: `extprocessor` must be declared in the same vhost.conf as the `context /` that references it (server-level declaration isn't picked up).

## Useful prompts for future sessions

- "Pick up Phase 1b" — wallet passes + city/category hubs
- "Start Phase 2" — organiser Stripe Connect onboarding
- "Run the migration importer" — pull events from the legacy Laravel DB
- "Audit accessibility" — full WCAG 2.2 AA sweep
