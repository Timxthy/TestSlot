# Deployment — TestSlot Radar (Netlify)

The Next.js 14 web application in `apps/web` deploys through Netlify from the monorepo root. This document records the current deployment contract and its known pre-pilot limitations.

## 1. Netlify build settings

| Setting | Value |
|---|---|
| Base directory | Repository root |
| Build command | `pnpm build` |
| Publish directory | `apps/web/.next` |
| Node version | `20` |
| Package manager | pnpm 9.15.0 |
| Next.js integration | `@netlify/plugin-nextjs` |

Build from the repository root so Netlify sees `pnpm-lock.yaml` and installs all workspace packages.

## 2. Environment variables

### Public build/runtime configuration

| Variable | Context | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Every intended context | Canonical site origin |
| `NEXT_PUBLIC_GOVUK_BOOKING_URL` | Every intended context | GOV.UK booking action |
| `NEXT_PUBLIC_SUPABASE_URL` | Live contexts | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Live contexts | Public Supabase publishable key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | Consented browser analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional | PostHog host, normally EU |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Consented browser error reporting |

`NEXT_PUBLIC_*` values are compiled into browser assets and are not secrets.

### Server-only configuration

| Variable | Required when enabled | Purpose |
|---|---|---|
| `SUPABASE_URL` | Live data mode | Server Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Live data mode | Privileged server-only database access |
| `AUTH_RATE_LIMIT_SECRET` | Recommended in live mode | Dedicated HMAC pepper for auth abuse buckets; the service-role key is the fallback |
| `CRON_SECRET` | Scheduled jobs | Bearer secret for cron route handlers |
| `RESEND_API_KEY` | Cancellation email delivery | Resend API credential |
| `RESEND_FROM` | Cancellation email delivery | Verified sender |
| `UNSUBSCRIBE_SECRET` | Email delivery | Unsubscribe signature secret; falls back to `CRON_SECRET` |
| `POSTHOG_KEY` | Optional | Consented server product events |
| `POSTHOG_HOST` | Optional | Server PostHog host |

Never expose the service-role key, auth-rate-limit secret, cron secret, unsubscribe secret or provider keys through a `NEXT_PUBLIC_` variable.

### Public-launch evidence

These variables are evidence records, not feature flags:

```text
LEGAL_REVIEWED_AT
DPIA_SIGNED_OFF_AT
PROCESSOR_AGREEMENTS_SIGNED_OFF_AT
```

Do not set them until the matching evidence exists in `docs/launch-readiness.md`.

## 3. Current runtime-mode limitation

The current application enters live data mode when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present. It then requires `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without the server pair it uses mock data.

This inferred mode is a temporary baseline, not the final staging contract. Until Phase 1 introduces explicit `mock`, `staging` and `production` modes:

- production must receive the complete live variable set;
- previews must intentionally omit server credentials and remain mock;
- no preview may receive production service-role credentials;
- partial live configuration must be treated as a deployment error, even where the current app falls back to mock behavior.

## 4. Database migration procedure

Apply migrations in numeric order. For the launch-hardening branch, the expected head is:

```text
supabase/migrations/0012_launch_hardening.sql
```

Before production application, record evidence for both:

1. applying `0012` to an isolated database already at `0011`;
2. applying `0001` through `0012` from zero in an isolated Supabase-compatible database.

Migration `0012`:

- creates/backfills `profiles` from `auth.users`;
- creates service-role-only auth attempt buckets and an atomic consume function;
- retains approved active cancellation reads while removing raw cancellation rows from the realtime publication;
- publishes only one content-free refresh row per centre;
- adds an atomic notification delivery claim with a ten-minute stale-pending lease;
- enforces follow and rolling 24-hour submission limits under per-user advisory locks;
- maps follow and daily-limit failures to SQLSTATE `TS001` and `TS002`.

After application, verify:

- RLS is enabled on new tables;
- anon/authenticated roles can only select `cancellation_board_events`;
- auth bucket and claim functions are executable only by `service_role`;
- `cancellation_posts` is absent from `supabase_realtime`;
- `cancellation_board_events` is present in `supabase_realtime`;
- existing auth users have profiles without overwriting existing profile values;
- concurrent inserts cannot exceed follow/report/cancellation caps;
- concurrent workers obtain at most one active delivery claim.

Migration `0012` is unreleased work and may be corrected in place until first deployment. After it is applied to any shared environment, do not edit it; ship any correction as a new forward migration.

## 5. Authentication configuration and limitation

Configure the production Site URL and redirect allow list in Supabase Auth.

The recovered signup route uses Supabase email confirmation and a database trigger to create the profile. The confirmation currently returns to `/login`; the user then logs in manually. The application does not yet exchange a PKCE callback code into an SSR session and does not yet provide expired-link recovery or password reset.

Those account-lifecycle items are Phase 1 release dependencies. Do not claim that signup-to-session is complete until the callback and live staging auth tests exist.

## 6. Cancellation notification delivery

The Netlify scheduled function calls `/api/cron/deliver-notifications` every 15 minutes with `CRON_SECRET`.

The worker:

- selects all approved, active, unexpired community cancellation posts without a short lookback;
- uses `notification_deliveries` as the durable per-user/post/channel record;
- atomically claims new, failed or stale-pending work in the database;
- never reclaims a `sent` row;
- uses the delivery ID as Resend's provider idempotency key;
- retries failed work up to three attempts.

Resend retains provider idempotency keys for 24 hours. The database sent state remains the long-term dedupe record. A staging smoke test must cover a concurrent run, a failed retry and recovery after a scheduler outage before delivery is enabled for users.

## 7. Analytics and realtime

Browser and server analytics are disabled unless explicitly configured and remain consent-gated. Server capture requires `POSTHOG_KEY`; a public browser key does not silently enable it.

Realtime browser subscriptions are limited to:

- `centre_status`;
- `cancellation_board_events`, which contains only a centre slug and refresh timestamp.

Raw availability reports and raw cancellation posts must not be in the browser realtime publication.

## 8. Pre-deploy gate

Run under Node 20 after a frozen install:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm check:compliance
pnpm build
pnpm --filter web test:e2e
```

Also complete the migration evidence in section 4. `pnpm check:launch` is expected to fail while external legal evidence remains open.

Do not deploy or push the phase branch with:

- a failing baseline command;
- an untested migration;
- unexplained modified/untracked files;
- production credentials in a preview;
- false launch-evidence variables.

## 9. Post-deploy staging smoke

Against an isolated staging project:

1. verify the deployed commit and migration head;
2. create and confirm an account, then log in and complete onboarding;
3. verify own-row and public aggregate RLS behavior with separate sessions;
4. submit reports/cancellations up to and beyond database caps;
5. run concurrent notification workers and confirm one delivery claim;
6. interrupt a delivery, wait for the stale lease, then confirm recovery;
7. verify no raw cancellation content reaches a realtime browser subscription;
8. confirm no server secret appears in browser assets;
9. record results and remaining manual evidence in `docs/launch-readiness.md`.
