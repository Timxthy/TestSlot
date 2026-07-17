# TestSlot Radar

Community-powered UK driving-test availability intelligence.

> **No DVSA login · No licence number · No theory pass number · No auto-booking · No scanning.**

TestSlot Radar helps UK learners decide which test centres and times may be worth checking by aggregating observations that learners and verified instructors submit after checking GOV.UK themselves. It does not scan, poll, scrape, log in to, or book against DVSA systems.

## Current product

The repository contains a Next.js web product with:

- marketing, authentication and onboarding routes;
- centre follows, community availability reports and centre status signals;
- a moderated cancellation board;
- report confirmations, trust scoring and moderator audit records;
- manual reminders, web push and cancellation notification delivery;
- account export and deletion;
- consented analytics, error boundaries and realtime refreshes;
- unit, compliance and Playwright test suites;
- forward-only Supabase migrations in `supabase/migrations/`.

The service is not approved for public launch. The production requirements, phase order and evidence gates are in [`docs/production/`](docs/production/).

## Repository layout

```text
apps/
  web/             Next.js web product, route handlers and scheduled workers
packages/
  shared/          Shared schemas, product rules and compliance language
supabase/
  migrations/      Ordered database migrations
docs/
  production/      Production PRD, execution plan, task register and gates
```

## Prerequisites

- Node.js 20
- pnpm 9.15.0 (declared in the root `package.json`)

Enable the declared pnpm version with Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

## Local development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The app runs at `http://localhost:3000`.

With no server-side Supabase credentials, the current application runs against deterministic mock data. Copy `apps/web/.env.local.example` to `apps/web/.env.local` only when you intentionally need a local configuration.

The current live/mock decision is inferred from `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Explicit `mock`, `staging` and `production` modes, with invalid-configuration rejection, remain a Phase 1 dependency. Do not treat a preview as production-like merely because public Supabase variables are present.

## Database and authentication

Migrations must be applied in numeric order. Migration `0012_launch_hardening.sql` adds:

- profile creation for email-confirmed auth users, including an existing-user backfill;
- durable and bounded signup-attempt buckets;
- concurrent database enforcement of follow and daily submission caps;
- content-free cancellation-board realtime refresh pings;
- atomic notification-delivery claims and stale-worker recovery.

The recovered signup route no longer creates instantly confirmed users through the Admin API. When Supabase requires email confirmation, the user confirms the email and then logs in manually. A complete SSR/PKCE callback, expired-link recovery and password reset are intentionally deferred to Phase 1; the current flow must not be presented as a completed account lifecycle.

Never apply an unverified migration directly to production. The migration gate requires isolated application from `0011`, application from zero, RLS/grant checks, concurrency evidence and a documented forward-fix plan.

## Quality checks

The baseline local gate is:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm check:compliance
pnpm build
pnpm --filter web test:e2e
```

The external launch-evidence check is separate:

```bash
pnpm check:launch
```

`pnpm check:launch` is expected to fail until legal review, DPIA and processor-agreement evidence genuinely exists. Do not set evidence variables to make the command green without the underlying records.

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for Netlify configuration, migration ordering, scheduled delivery, current auth limitations and release checks.

## Compliance guardrails

- Every page states that TestSlot Radar is not affiliated with DVSA, DVLA or GOV.UK and that users book, change or cancel their own tests on GOV.UK.
- Approved and prohibited wording lives in `packages/shared/src/compliance.ts`; `pnpm check:compliance` enforces it.
- The product never collects DVSA credentials, driving-licence numbers, theory-pass numbers or booking references.
- Community observations and notifications are signals to check GOV.UK, never guarantees of availability.
