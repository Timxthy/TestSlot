# Deployment — TestSlot Radar (Netlify)

Chunk A of the post-hardening plan. The web app (`apps/web`, Next.js 14 App Router)
deploys to **Netlify** via the Next.js Runtime; `packages/shared` is a pnpm
workspace dependency. Config lives in [`netlify.toml`](netlify.toml).

## 1. Netlify site settings

When connecting the repo (Add new site → Import from Git):

| Setting | Value |
|---|---|
| Base directory | repo root (no `base` — `pnpm-lock.yaml` lives here) |
| Build command | `pnpm build` (set in `netlify.toml`) |
| Publish directory | `apps/web/.next` (set in `netlify.toml`) |
| Node version | **20** (set via `NODE_VERSION` in `netlify.toml`) |
| Package manager | pnpm (auto-detected from `pnpm-lock.yaml`) |
| Next.js plugin | `@netlify/plugin-nextjs` (auto-installed + pinned) |

> Build from the repo **root**, not `apps/web` — Netlify must see `pnpm-lock.yaml`
> at the root to detect pnpm and install the whole workspace. `base = "apps/web"`
> breaks that and caused the first failed preview build.

## 2. Environment variables (Netlify UI → Site config → Environment variables)

Context + secret settings matter here — get them wrong and the build fails.

| Variable | Mark secret? | Deploy contexts | Value |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | no | **All** | `https://testslotr.netlify.app` |
| `NEXT_PUBLIC_GOVUK_BOOKING_URL` | no | **All** | `https://www.gov.uk/book-driving-test` |
| `NEXT_PUBLIC_SUPABASE_URL` | **no** | **All** | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **no** | **All** | `sb_publishable_…` |
| `SUPABASE_URL` | yes | **Production only** | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Production only** | `sb_secret_…` (rotated) |

**Why this split (learned the hard way on the first prod deploy):**
- `NEXT_PUBLIC_*` are **inlined into the build** and are public by design, so they must
  be **non-secret** and available in **all contexts**. Marking them secret/scoping them
  to production starves the build and crashes it.
- The two real secrets are **Production-only**, so deploy previews never receive them.
- Live mode is gated on the **server secret** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`),
  not the public vars — see [`lib/supabase/config.ts`](apps/web/lib/supabase/config.ts). So
  previews (no secret) run cleanly in **mock mode**; production runs live. No preview can
  touch the real database.

## 3. Supabase Auth URL config

In the Supabase dashboard → Authentication → URL Configuration:
- **Site URL:** the production domain (e.g. `https://<prod-domain>`).
- **Redirect allow list:** add the production domain and the Netlify preview wildcard
  (e.g. `https://*--<your-site>.netlify.app/**`) so login/callback works on previews.

Keep `NEXT_PUBLIC_SITE_URL` in sync with the Site URL.

## 4. Pre-deploy checklist (all currently green locally)

```bash
pnpm typecheck              # ✓ exits 0
pnpm --filter web test:e2e  # ✓ 6/6 (mock mode)
pnpm build                  # ✓ 41 routes, ~34s
```

Verified the **service-role secret does not appear in the client bundle**
(`grep -r sb_secret apps/web/.next/static` → none).

> Note: local builds run on Node 18; Netlify builds on Node 20. The production
> build already passes on 18, so 20 should be equal or better. Bumping local to
> Node 20 (`nvm use 20`) clears the pnpm "Unsupported engine" + supabase-js warnings.

## 5. Post-deploy verification

1. Build succeeds on Netlify (Node 20).
2. Production URL loads; marketing pages render.
3. Re-run the read-only key smoke test against the **prod** env values (REST + Admin API → 200).
4. Confirm no `sb_secret` in deployed client assets (DevTools → Sources, or curl a JS chunk).
5. One auth round-trip on the live site (sign up / log in / log out).

## 6. Chunk B — notification delivery (scaffolded, inert)

Now in the tree, guarded so it sends nothing until configured:
- [`app/api/cron/deliver-notifications/route.ts`](apps/web/app/api/cron/deliver-notifications/route.ts)
  — service-role worker: finds newly approved+active cancellation posts → emails
  opted-in followers via Resend → records each send in `notification_deliveries`
  (unique index = idempotent re-runs). Requires `Authorization: Bearer ${CRON_SECRET}`.
- [`netlify/functions/deliver-notifications.ts`](apps/web/netlify/functions/deliver-notifications.ts)
  — Netlify Scheduled Function (every 15 min) that pings the route with the secret.
- [`lib/email/resend.ts`](apps/web/lib/email/resend.ts) — dependency-free Resend REST client.
- [`supabase/migrations/0003_notification_deliveries.sql`](supabase/migrations/0003_notification_deliveries.sql)
  — deliveries/dedupe table (**not yet applied** — review first).

**Verified inert:** with no secret → 401; wrong secret → 401; correct secret in
mock mode → `200 {"skipped":true,...}`.

**To activate:** apply migration `0003`; set `RESEND_API_KEY`, `RESEND_FROM`
(verified domain), and `CRON_SECRET` in Netlify env. Then a manual POST with the
secret should report `{ok:true, posts, queued, sent, skipped}`.

**Compliance:** deliveries are triggered only by user-submitted, moderated community
events — never by scanning DVSA.

## 7. Observability, analytics + realtime (scaffolded, inert)

All inert until configured, so they are safe to ship before the accounts exist.

**Analytics (PostHog, EU region).** Set in Netlify:

| Variable | Mark secret? | Contexts | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | no | All | publishable key (`phc_…`); enables analytics + the cookie banner |
| `NEXT_PUBLIC_POSTHOG_HOST` | no | All | defaults to `https://eu.i.posthog.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | no | All | optional; loads Sentry (consent-gated) for richer error context |
| `POSTHOG_KEY` / `POSTHOG_HOST` | no | All | optional server-only override; falls back to the `NEXT_PUBLIC_` values |

- **Privacy by design:** with no key set there is **no cookie banner and no
  cookie**. Browser analytics ([`lib/analytics/client.ts`](apps/web/lib/analytics/client.ts))
  loads PostHog only after the user accepts the banner; a "Cookie settings"
  control in the footer lets them change or withdraw consent.
- **Server-side events** ([`lib/analytics/server.ts`](apps/web/lib/analytics/server.ts))
  are dependency-free and carry IDs/counts only — no email or report contents.
- App-wide error boundaries ([`app/error.tsx`](apps/web/app/error.tsx),
  [`app/global-error.tsx`](apps/web/app/global-error.tsx)) report a bounded
  `$exception` to PostHog for an error-rate signal, and forward the full
  exception to Sentry when its DSN is set (loaded via the dependency-free loader
  script, also after consent).

**Realtime live feeds.** The centre page and cancellation board subscribe to
public-read tables and refresh on change ([`RealtimeRefresh`](apps/web/components/app/RealtimeRefresh.tsx)).
Inert unless `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
present **and** the tables are in the realtime publication.

**To activate realtime:** apply [`supabase/migrations/0011_realtime.sql`](supabase/migrations/0011_realtime.sql)
(idempotent — adds `centre_status` + approved-only `cancellation_posts` to the
`supabase_realtime` publication). RLS still governs delivery, so clients only
ever receive rows they may already read.
