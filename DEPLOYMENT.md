# Deployment — TestSlot Radar (Netlify)

Chunk A of the post-hardening plan. The web app (`apps/web`, Next.js 14 App Router)
deploys to **Netlify** via the Next.js Runtime; `packages/shared` is a pnpm
workspace dependency. Config lives in [`netlify.toml`](netlify.toml).

## 1. Netlify site settings

When connecting the repo (Add new site → Import from Git):

| Setting | Value |
|---|---|
| Base directory | `apps/web` (set in `netlify.toml`) |
| Build command | `pnpm build` (set in `netlify.toml`) |
| Node version | **20** (set via `NODE_VERSION` in `netlify.toml`) |
| Package manager | pnpm (auto-detected; `ENABLE_COREPACK=true` pins `pnpm@9.15.0`) |
| Next.js plugin | `@netlify/plugin-nextjs` (auto-installed + pinned) |

> If the pnpm-workspace install ever fails with `base = "apps/web"`, switch to the
> root-build fallback documented at the bottom of `netlify.toml`.

## 2. Environment variables (Netlify UI → Site config → Environment variables)

Set these as **scoped** to the right deploy contexts. Only `NEXT_PUBLIC_*` reach
the browser — everything else stays server-only.

| Variable | Public? | Production | Deploy previews | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | `https://<prod-domain>` | preview URL | canonical URL, used by metadata/sitemap |
| `NEXT_PUBLIC_GOVUK_BOOKING_URL` | yes | `https://www.gov.uk/book-driving-test` | same | |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | project URL | same | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | `sb_publishable_…` | same | publishable key |
| `SUPABASE_URL` | **no** | project URL | same | server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | **no** | `sb_secret_…` (rotated) | same | bypasses RLS — never expose |

Remember the **all-or-nothing rule**: set all four Supabase vars together or none
(partial config throws). See [`lib/supabase/config.ts`](apps/web/lib/supabase/config.ts).

⚠️ **Deploy-preview data caveat:** previews that carry the live env will read/write
your **production** Supabase. For now that's acceptable; when it matters, point
previews at a separate Supabase project (or scope the Supabase vars to Production only).

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
