# Droptix phase roadmap

## Phase 0 — Foundation (current)

Scaffold that does nothing end-user facing but everything downstream depends on.

- [x] Next.js 15 + TS + Tailwind + shadcn base
- [x] Prisma schema (events, ticket types, orders, tickets, organisers, commission rules, scan events, refunds, payouts, images, integrations, webhook events, admin audit, feature flags)
- [x] Money value object + commission engine (100% tested)
- [x] Ticket HMAC signing + verification
- [x] Design tokens (violet + Geist) with dark-mode companion
- [x] Accessibility defaults in CSS (focus rings, target size, reduced motion)
- [x] ESLint "money rule" banning `parseFloat` / `Number()` on money identifiers
- [x] CI pipeline (lint, typecheck, vitest, Playwright + axe, Pa11y)
- [x] CyberPanel deploy workflow + PM2 config
- [x] Health check, manifest, robots.txt, sitemap stubs

## Phase 1 — Buyer MVP

What a visitor can do end-to-end.

- [ ] City/category discovery pages `/uk/{city}/{category}/`
- [ ] Event detail page with JSON-LD `Event` + `Offer` + `Place` + `Performer`
- [ ] Ticket selection (Radix RadioGroup, sticky buy footer on mobile)
- [ ] Server-side Stripe Checkout session create with `application_fee_amount`
- [ ] Webhook-authoritative ticket issuance
- [ ] Transactional emails (Postmark) with wallet-pass attachment
- [ ] Digital ticket page with QR + door code + Apple/Google Wallet buttons
- [ ] Magic-link login + "my tickets" account
- [ ] Wishlist
- [ ] Dynamic sitemap index split by city + month

## Phase 2 — Organiser MVP

What a promoter can do self-serve.

- [ ] Stripe Connect Express onboarding
- [ ] Event creation wizard (5 steps, autosaves each step)
- [ ] Image upload with in-flow cropping (React-Image-Crop → R2 presigned PUT → Cloudflare Images)
- [ ] Ticket type editor (name, capacity, price, sale window, unlock codes)
- [ ] Live sales dashboard (SSR + RSC streaming)
- [ ] Attendee table with search + CSV export
- [ ] Scanner crew PIN invite flow
- [ ] Door scanner PWA (service worker, IndexedDB, Background Sync)
- [ ] Payout ledger view

## Phase 3 — Admin MVP

What platform staff need to run the business.

- [ ] Organiser approval queue + KYC status mirror
- [ ] Per-organiser commission rule editor (immutable versioning UI)
- [ ] Integrations panel (Stripe, Postmark, R2 keys) — the thing the user asked for
- [ ] Refund + dispute queue
- [ ] Event overrides (feature, suspend, cancel-with-refund-all)
- [ ] Platform KPIs (GMV, take rate, chargeback rate, NRR)
- [ ] Feature flag editor
- [ ] Admin audit log viewer

## Phase 4 — Launch polish

- [ ] Editorial city hubs + venue/artist entity pages (SEO moat)
- [ ] Full WCAG 2.2 AA audit pass + accessibility statement
- [ ] Load test flash-sale (k6, target 500 checkout/min)
- [ ] Security review (headers, CSP, rate limits, Turnstile)
- [ ] Legal review of T&Cs, privacy, organiser agreement, refund policy
- [ ] Skiddle/Fatsoma CSV importer
- [ ] Analytics (Plausible) + Sentry in place

## Phase 5+ — Post-launch differentiators

Priority order per product brief:

1. Waitlists + presales/unlock codes
2. Referral credit (£2 off next ticket)
3. Refund protection upsell at checkout
4. Verified attendee reviews
5. Spotify / Apple Music artist linkage
6. **Face-value resale marketplace** (flagship, timed with UK CMA Nov 2025 cap)
7. Reserved seating
8. Recommendation feed
