# TestSlot Radar

Community-powered UK driving test availability intelligence.

> **No DVSA login · No licence number · No theory pass number · No auto-booking · No scanning.**

TestSlot Radar helps UK learners know **which test centres and times are worth checking** by aggregating what other learners and verified instructors report — *after they check GOV.UK themselves*. It does **not** scan, poll, scrape, log into, or book against the DVSA booking service, and it never collects licence numbers, theory pass numbers, booking references, or DVSA logins.

The full product plan lives outside the repo (approved build plan). This repository currently implements **Phase 0 — the marketing site + waitlist**.

## Monorepo layout

```
apps/
  web/        # Next.js marketing site + (later) learner web app
packages/
  shared/     # zod schemas, types, compliance copy, banned-phrase list, centre seed
```

Later phases add `apps/mobile` (Expo), `apps/admin` (Next.js), `packages/ui`, and `supabase/`.

## Prerequisites

- Node.js >= 18.18 (this repo was scaffolded on 18.20)
- pnpm 9 (`corepack enable pnpm`)

## Getting started

```bash
pnpm install
pnpm dev          # runs the web app on http://localhost:3000
```

Other scripts:

```bash
pnpm build              # production build
pnpm typecheck          # type-check every package
pnpm lint               # eslint
pnpm check:compliance   # fail if any banned marketing phrase appears in the source
```

## Waitlist storage (Phase 0)

The waitlist API (`/api/waitlist`) writes through `apps/web/lib/waitlist.ts`:

- **Production:** set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` and it writes to a `waitlist` table.
- **Local dev (default):** with no Supabase env set, entries append to `apps/web/.data/waitlist.json` (gitignored) so the form works end-to-end with zero setup.

Copy `apps/web/.env.local.example` to `apps/web/.env.local` to configure.

## Compliance guardrails

- Every page carries the disclaimer: *not affiliated with DVSA/DVLA/GOV.UK; you must book/change/cancel/swap your own test on GOV.UK*.
- Approved vs banned marketing wording lives in `packages/shared/src/compliance.ts`. `pnpm check:compliance` fails the build if a banned phrase (e.g. "live DVSA scanner", "guaranteed earlier test") appears in the source.
- Data minimisation: the waitlist collects email + postcode **area** + optional role only. No DVSA data fields exist anywhere.
