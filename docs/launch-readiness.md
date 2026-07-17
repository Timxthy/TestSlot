# Launch Readiness Register

Status: **not approved for public launch**.

Passing local tests is necessary but not sufficient. Public launch requires external legal evidence, isolated database evidence, live staging evidence and operating evidence.

## External hard gates

| Gate | Required evidence | Status |
|---|---|---|
| Privacy notice reviewed by a UK solicitor | Reviewed Privacy page version, reviewer and date | Open |
| Terms reviewed by a UK solicitor | Reviewed Terms page version, reviewer and date | Open |
| DPIA signed off | Completed DPIA with risk decisions and date | Open |
| Processor agreements checked | Decision record for every enabled processor | Open |

## Phase 0 recovery evidence

| Evidence | Status | Record |
|---|---|---|
| Original dirty worktree preserved | Complete | Durable snapshot in `Downloads/TestSlot-Radar-Recovery-2026-07-17/` contains the bundle, binary patch, status, remotes and untracked archive |
| Neutral phase branch | Complete | `release/launch-hardening` |
| Every changed file classified | Complete | Classification is recorded below; no generated or debug artifact was retained |
| Migration `0012` audited | Complete | Dependencies, RLS/grants, search paths, existing rows, concurrency, realtime privacy, SQLSTATE mapping, retry parity and forward-fix policy verified |
| Apply `0012` after `0011` in isolation | Complete | Populated PostgreSQL 17.10 schema at `0011` upgraded and passed `supabase/tests/0012_launch_hardening.test.sql` |
| Apply `0001`–`0012` from zero | Complete | Fresh PostgreSQL 17.10 cluster applied every migration, passed assertions, then reapplied `0012` successfully |
| Clean Node 20 / pnpm 9 frozen install | Complete | Node 20.20.2, pnpm 9.15.0, `pnpm install --frozen-lockfile`, 448 packages in `/private/tmp/testslot-final-clean.qRiQK2` |
| Full Phase 0 command gate | Complete | Typecheck, lint, 108 unit tests, compliance and production build passed in the clean copy |
| Mock-mode Playwright | Complete | 13 Chromium journeys passed against the clean copy |

Do not change an "Evidence needed" row to complete without recording the environment, command, date and result.

## Recovered file classification

### Kept and completed

- Authentication: signup route, confirmation notice, safe redirect preservation, durable signup-abuse helpers and tests.
- Database enforcement: route error mapping, follow/report/cancellation caps, profile trigger/backfill and stable SQLSTATEs.
- Notification delivery: outage-safe selection, atomic database claims, stale-pending recovery, retry-cap parity and provider idempotency keys.
- Realtime: centre-level content-free cancellation refresh pings and raw cancellation publication removal.
- Privacy and launch control: consent-gated server analytics, account-deletion event removal, legal copy, launch check and tests.
- Documentation and scripts: README, deployment guide, launch-readiness register, package scripts and all five supplied production documents.
- Migration verification: the local Supabase-compatible harness and `0012` assertion suite under `supabase/tests/`.

### Removed

- `apps/web/lib/legal/launch-readiness.ts`: unused duplicate launch-gate logic. Tests now execute the actual `check-launch-readiness.mjs` command instead.

No legitimate uncommitted product work was removed. No debug log, generated build output, local environment file or operator prompt was added to the repository.

### Deferred to later phases

- Explicit runtime modes and invalid-configuration rejection.
- Complete SSR/PKCE confirmation callback, password reset and security settings.
- Recent-authentication protection for account deletion.
- Persistent cross-device notifications and provider-failure operations.
- Live Supabase staging auth, JWT/RLS and realtime-delivery evidence.
- Later moderation, UX, operations, load, billing and mobile work defined in the production plan.

## Production evidence variables

The launch check passes only when these server-side values are present:

```bash
LEGAL_REVIEWED_AT=YYYY-MM-DD
DPIA_SIGNED_OFF_AT=YYYY-MM-DD
PROCESSOR_AGREEMENTS_SIGNED_OFF_AT=YYYY-MM-DD
```

Do not set them until the corresponding evidence exists. They are records of review, not feature flags.

## Current Phase 1 dependencies

The recovered baseline intentionally does not claim a complete account lifecycle. Remaining release dependencies include:

- explicit `mock`, `staging` and `production` runtime modes;
- a Supabase SSR/PKCE confirmation callback;
- useful expired/invalid confirmation recovery;
- forgotten-password and reset-password flows;
- live staging authentication lifecycle tests;
- recent-authentication or step-up protection for destructive deletion.

Until these are complete, email confirmation returns to login and the user logs in manually after confirming.

## Migration `0012` review contract

Before application to a shared environment, verify:

- existing auth users receive missing profiles without overwriting current profile fields;
- security-definer functions use fixed search paths and are not public RPCs;
- auth buckets are service-role-only, atomic and cleaned after one day;
- the approved active board remains readable through normal queries;
- raw `cancellation_posts` is removed from realtime;
- `cancellation_board_events` exposes only centre slug and timestamp;
- visible, hidden, moved and deleted cancellation transitions all emit refresh pings;
- follow and submission caps hold under concurrent inserts;
- route mappings recognize SQLSTATE `TS001` and `TS002`;
- delivery claims prevent concurrent ownership, recover stale pending work and never reclaim sent work.

Migration `0012` is unreleased and may be revised before first application. Once applied to any shared environment, corrections must use a new forward migration.

## Processor scope

- Supabase: authentication, database, realtime and privileged scheduled processing.
- Resend: transactional notification email delivery.
- PostHog: consented browser/server product analytics, if enabled.
- Sentry: consented browser error reporting, if enabled.

If a processor is disabled in production, record that decision alongside the processor review.

## Evidence log

### 17 July 2026 — Phase 0 local recovery

- Safety snapshot: `Downloads/TestSlot-Radar-Recovery-2026-07-17/`.
- Application environment: isolated source copy, Node 20.20.2, pnpm 9.15.0, frozen lockfile install.
- Application results: typecheck passed; lint passed with no warnings; 48 shared and 60 web unit tests passed; compliance scanned 129 files; production build generated 47 routes; 13 Chromium Playwright tests passed.
- Build note: Next emitted the existing non-fatal Supabase dependency warning about `process.version` in Edge Runtime code.
- Database environment: two fresh socket-only PostgreSQL 17.10 clusters with pg_cron 1.6.7 and the local Supabase compatibility harness.
- Database results: zero-to-`0012`, repeat `0012`, populated `0011`→`0012`, profile preservation/backfill, existing-row backfills, RLS/grants, publication membership, visibility transitions, SQLSTATEs, bounded auth buckets, caps and notification claim/recovery assertions passed.
- Concurrency results: overlapping follow inserts ended at the free cap of 3 with one `TS001`; overlapping report inserts ended at 5 with one `TS002`; overlapping notification workers produced one pending claim at attempt 1.
- Launch check: expected exit 1 because solicitor review, DPIA and processor-agreement evidence remain open. No evidence variable was falsified.
- Local database limitation: the harness verified publication membership but ran with non-logical WAL. Actual Supabase Realtime delivery, authenticated JWT/RLS behavior and the complete auth lifecycle still require isolated live staging evidence.
