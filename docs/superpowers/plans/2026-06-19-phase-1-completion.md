# Phase 1 Completion Plan — TestSlot Radar Web MVP

> **For agentic workers:** implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Each task ends with explicit acceptance criteria + verification. Do not start Phase 2+ (mobile, payments, instructor verification, SEO-at-scale) until the Stop Conditions below are met.

**Goal:** Take the web app from "CRUD shells that are live" to the **complete, durable Phase 1 community loop** defined in the PRD (`~/.claude/plans/below-is-the-prd-ethereal-toucan.md` §6–§14, §17 Phase 1) and the hardening plan's named follow-ups. Close the gap between what is deployed and what the PRD calls the product's *hard parts*: the status engine, trust/anti-scam, moderation integrity, manual reminders, and GDPR tooling.

**Boundary (unchanged, defines the product):** never log into / poll / scrape / scan / automate / transact against DVSA; never store licence/theory/booking-ref/login. All availability data comes from authenticated user/instructor submissions. Every status surface carries *"Based on community reports, not live DVSA data."* See [[testslot-radar-compliance-boundary]].

**Tech stack (committed):** Next.js App Router, Supabase (Postgres + RLS + Auth + pg_cron), TypeScript, Zod, Vitest, Playwright, pnpm/Turbo. Netlify deploy. Resend email. Web push via VAPID. (Edge Functions optional — Next route handlers + pg_cron + Netlify Scheduled Functions are acceptable equivalents and are what the repo already uses.)

---

## Current reality (verified 2026-06-19)

**Live in production** (`testslotr.netlify.app`): Phase 0 marketing + waitlist; auth (signup/login, instant-confirm); follow centres; report + cancellation submission; in-app notification feed; **email notification delivery** (cron + Resend + dedupe + one-click unsubscribe — built this cycle); admin moderation page; E2E (6 specs) + CI; Supabase live with RLS hardening (migrations `0001`, `0002` applied; `0003` notification_deliveries applied).

**Existing tables (7):** `profiles`, `test_centres`, `user_centres`, `availability_reports`, `cancellation_posts`, `waitlist`, `notification_deliveries`.

**Confirmed MISSING (PRD §5) — 10 tables:** `centre_status`, `centre_heatmap` (mat. view), `nearby_centres`, `device_tokens`, `reminder_preferences`, `subscriptions`, `report_confirmations`, `content_flags`, `moderation_actions`, `audit_logs`.

**Confirmed MISSING behaviours:** durable status engine (status/heatmap computed on-read in app, no `centre_status` table, no pg_cron recompute); rate limiting (PRD §25.5 caps); scam filter on **reports** (only cancellations are filtered today); `decays_at` computation; trust scoring/recompute + trust-weighted confidence; immutable moderation/audit trail; manual reminder loop (the product's core nudge); GDPR export/delete; notification free-delay vs premium-instant tiers; realtime feeds; analytics/observability (PostHog/Sentry); real Privacy/Terms + legal-review gate.

---

## Architecture decisions for this plan

1. **Status engine lives in SQL** (PRD §7.6: "no client-trusted computation"). Thresholds stay in `packages/shared/status.ts` as the documented source of truth; the SQL recompute mirrors them. App read paths switch from computing-on-read to reading `centre_status` / `centre_heatmap`.
2. **Scheduling:** `pg_cron` for DB-internal recompute (status, trust, heatmap refresh, decay cleanup); **Netlify Scheduled Functions** for outbound work that needs app env (reminders, notification dispatch) — reusing the existing `apps/web/netlify/functions` pattern.
3. **Keep admin as a route-group for Phase 1**, but add immutable audit logging now; the separate MFA-gated `apps/admin` (PRD §4) is **Phase 1.5** (documented in Follow-Up), not this plan.
4. **Subscriptions modelled now, billing later.** Add the `subscriptions` table + entitlement gates so notification tiers work; RevenueCat/Stripe wiring is Phase 3.
5. **Reuse the `DataStore` abstraction** (`apps/web/lib/data/store.ts`) — new reads/writes get interface methods implemented in both `mock-store.ts` and `supabase-store.ts` so E2E mock mode keeps working.

---

## Sequencing (safety-first, because the app is already live)

1. **Task 1 — Abuse & data-integrity rails** (rate limits, report scam filter, `decays_at`, `content_flags`)
2. **Task 2 — Moderation integrity** (`moderation_actions` + `audit_logs`, wire admin actions)
3. **Task 3 — Durable status engine** (`centre_status` + `centre_heatmap` + pg_cron recompute)
4. **Task 4 — Trust scoring & confirmations** (`report_confirmations`, trust recompute, trust-weighted confidence)
5. **Task 5 — Manual reminders** (`reminder_preferences`, `device_tokens`, web push, scheduled nudges)
6. **Task 6 — GDPR export & deletion** (DSAR export, anonymising delete)
7. **Task 7 — Notification tiers** (`subscriptions`, free-delay vs premium-instant, weekly summary)
8. **Task 8 — Realtime, observability & legal gate** (Supabase Realtime feeds, PostHog/Sentry, real Privacy/Terms + DPIA, cookie consent)
9. **Task 9 — Test & compliance hardening** (RLS integration tests, status-engine unit tests, rate-limit/scam tests, banned-phrase + a11y pass)

Each migration is additive and `IF NOT EXISTS`-guarded where possible. Every new table gets explicit RLS (PRD §5). Apply migrations via the Supabase MCP/dashboard (never via the guarded seed script).

---

## Task 1 — Abuse & data-integrity rails  *(PRD §5, §13.3, §25.5)*

**Files:** `supabase/migrations/0004_integrity.sql` (new), `packages/shared/src/reports.ts`, `packages/shared/src/decay.ts` (new), `apps/web/app/api/reports/route.ts`, `apps/web/app/api/cancellations/route.ts`, `apps/web/lib/data/store.ts` + `supabase-store.ts` + `mock-store.ts`, tests.

- [ ] **Step 1 — `content_flags` table + decay support.** Migration adds `content_flags(id, content_type, content_id, rule_matched, severity, auto_action, created_at)` with RLS (moderator read only). Confirm `availability_reports.decays_at` exists (it does) and add a partial index `availability_reports(centre_slug, checked_at desc) where decays_at > now()`.
- [ ] **Step 2 — Decay table in shared.** `packages/shared/src/decay.ts`: map report_type → TTL (PRD §13.2: cancellation_seen 15–60 min, tests_available 2–6 h, no_tests_found 12–24 h, others sensible defaults). Export `computeDecaysAt(type, checkedAt)`.
- [ ] **Step 3 — Scam filter on reports.** In the report write path, run the existing `screenForScam` on `note` (parity with cancellations) and set `decays_at` via `computeDecaysAt`. On flag, insert a `content_flags` row and route per auto-moderation level (L0 approve … L3 block).
- [ ] **Step 4 — Rate limiting.** Add `DataStore.countRecent(userId, kind, sinceMs)`; before insert, enforce PRD §25.5 caps by trust level (new ≤5 reports/day, trusted ≤30/day, cancellations ≤3/day, abuse ≤20/day). Over cap → `429`. Implement as a service-role count query (no new table needed initially).
- [ ] **Step 5 — Tests.** Vitest: decay mapping; scam-flag on a banned phrase; rate-limit boundary (5th allowed, 6th rejected for a new user).

**Acceptance:** a new account is blocked after its daily cap; report notes with scam phrases are flagged/blocked and recorded in `content_flags`; every report has a correct `decays_at`. **Verify:** `pnpm --filter @testslot/shared test`, `pnpm typecheck`, `pnpm build`.

---

## Task 2 — Moderation integrity  *(PRD §12, §13)*

**Files:** `supabase/migrations/0005_moderation_audit.sql` (new), `apps/web/app/api/admin/cancellations/route.ts`, `apps/web/lib/data/*`.

- [ ] **Step 1 — Immutable tables.** `moderation_actions(id, moderator_id, target_type, target_id, action, reason, created_at)` and `audit_logs(id, actor_id, action, target_type, target_id, metadata jsonb, created_at)`. RLS: moderators read; **no update/delete policy** (append-only). Revoke UPDATE/DELETE from all roles.
- [ ] **Step 2 — Record every moderation action.** On approve/reject in the admin route, write a `moderation_actions` row (service role) in the same flow. Add `DataStore.recordModeration(...)`.
- [ ] **Step 3 — Audit sensitive writes.** Log admin/service mutations (moderation, role changes, deletions) to `audit_logs`.

**Acceptance:** approving/rejecting a cancellation creates an immutable `moderation_actions` row; audit rows cannot be updated/deleted even by the service role policy. **Verify:** typecheck/build; SQL check that an UPDATE on `moderation_actions` is rejected.

---

## Task 3 — Durable status engine  *(PRD §7 — the product's heart)*

**Files:** `supabase/migrations/0006_status_engine.sql` (new), `apps/web/lib/data/supabase-store.ts`, status read paths (`dashboard`, `centres/[slug]`).

- [ ] **Step 1 — `centre_status` table** `(centre_slug pk → test_centres, status, confidence int, metrics jsonb, computed_at)`, engine-written, public read RLS.
- [ ] **Step 2 — `centre_heatmap` materialized view** aggregating `availability_reports` by `centre_slug × dow × time_band × report_type` with unique-reporter counts; public read.
- [ ] **Step 3 — Recompute SQL function** mirroring `STATUS_RULES` (§7 table: active_now / recently_active / dry / high_queue / error / quiet / unclear), confidence = f(unique reporters × trust weight × recency). Excludes decayed rows (`decays_at > now()`).
- [ ] **Step 4 — Schedule.** `pg_cron` every 5 min: recompute `centre_status`, refresh `centre_heatmap`, delete decayed reports. (Document the cron in the migration.)
- [ ] **Step 5 — Switch reads.** `supabase-store.listCentreStatuses/getCentreStatus/getHeatmap` read the tables instead of computing on read; `mock-store` keeps computing (so E2E stays offline). Keep the "community-reported" label on every surface.

**Acceptance:** status cards reflect `centre_status` written by cron, not on-the-fly app computation; heatmap reads the view; decayed reports stop affecting status. **Verify:** seed a local DB, run recompute, assert a centre flips active_now→quiet after decay; `pnpm build`.

---

## Task 4 — Trust scoring & confirmations  *(PRD §13)*

**Files:** `supabase/migrations/0007_trust.sql` (new), `packages/shared/src/trust.ts` (new), recompute job, confidence wiring in Task 3.

- [ ] **Step 1 — `report_confirmations(id, report_id, user_id, agrees, created_at)`**, unique `(report_id, user_id)`, RLS insert-own.
- [ ] **Step 2 — Trust weights/levels in shared** (`trust.ts`): inputs = account age, confirmed reports, flags, abuse reports, posting rate, scam similarity → score → label (New/Normal/Trusted/Verified/Watchlist/Restricted/Banned). Never expose the raw number.
- [ ] **Step 3 — Recompute job** (`pg_cron` daily or Netlify scheduled): write `profiles.trust_score`. Feed trust weight into the status engine's confidence (Task 3 Step 3).
- [ ] **Step 4 — Confirm UI/API** ("still there / not there") writing `report_confirmations`.

**Acceptance:** confirmations adjust a report's effective confidence; trusted users' reports weigh more; restricted users gate to moderation. **Verify:** unit tests for trust computation; integration test confidence delta.

---

## Task 5 — Manual reminders  *(PRD §6.4 — completes the core loop)*

**Files:** `supabase/migrations/0008_reminders.sql` (new), `apps/web/app/(app)/settings` or onboarding UI, `apps/web/netlify/functions/send-reminders.ts` (new), web push service worker + subscribe flow, `apps/web/lib/push.ts` (new).

- [ ] **Step 1 — Tables.** `reminder_preferences(user_id pk, times text[], timezone, enabled, channels text[])`; `device_tokens(id, user_id, token/subscription jsonb, platform, created_at)`. RLS own-row.
- [ ] **Step 2 — Web push infra.** VAPID keys (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`), a service worker, a subscribe button storing the PushSubscription in `device_tokens`.
- [ ] **Step 3 — Scheduled dispatch.** Netlify Scheduled Function (every 15 min) finds users whose local time matches a preference slot (Europe/London, BST-aware) and sends a *"Check GOV.UK manually"* web push. **Server schedules time only; never checks DVSA.**
- [ ] **Step 4 — UI.** Reminder-times settings (defaults 5:55/12:30/20:30 + Sun eve/Mon am, customisable, toggle).

**Acceptance:** a user sets reminder times and receives a web push at those times with manual-check copy; no DVSA access anywhere. **Verify:** trigger the function with a forced "now"; confirm a push delivery + an audit/log entry. (Device-local Expo reminders are Phase 2.)

---

## Task 6 — GDPR export & deletion  *(PRD §11)*

**Files:** `apps/web/app/api/account/export/route.ts` (new), `apps/web/app/api/account/delete/route.ts` (new), settings UI.

- [ ] **Step 1 — DSAR export.** Authenticated endpoint returns the user's PII + content as JSON (profile, follows, reports, cancellations, prefs, subscription, deliveries).
- [ ] **Step 2 — Anonymising delete.** Soft-delete + anonymise authorship: null/anonymise `availability_reports.user_id` (FK already `on delete set null`) so **aggregates/status stay intact**, delete profile + auth user + PII, write an `audit_logs` row. (PRD §6.1 "hard part".)
- [ ] **Step 3 — UI + confirmations** in account settings; copy explains what's removed vs retained-anonymised.

**Acceptance:** export returns complete user data; deletion removes PII while centre status/heatmap are unchanged. **Verify:** integration test export shape; delete a test user and assert status unchanged + PII gone.

---

## Task 7 — Notification tiers  *(PRD §14, §6.13 model-only)*

**Files:** `supabase/migrations/0009_subscriptions.sql` (new), `apps/web/app/api/cron/deliver-notifications/route.ts`, `packages/shared/src/entitlements.ts` (new).

- [ ] **Step 1 — `subscriptions(id, user_id, tier, provider, status, current_period_end, entitlements jsonb)`**, default everyone `free`. Entitlement helpers in shared (centre limit 3/10, instant vs delayed alerts, heatmap access).
- [ ] **Step 2 — Throttle in the delivery cron.** Free tier delayed 10–15 min (only email cancellations older than the delay window); premium instant. Instructor posts instant to followers. Gate heatmap + follow-count by entitlement.
- [ ] **Step 3 — Weekly summary** notification (scheduled).

**Acceptance:** a free follower's email is delayed vs a premium follower's; follow-count + heatmap gates respect tier. (Billing wiring = Phase 3.) **Verify:** unit test the throttle decision; integration test delay.

---

## Task 8 — Realtime, observability & legal gate  *(PRD §9, §14, §11.4)*

- [ ] **Step 1 — Realtime feeds.** Supabase Realtime channels for centre feed + cancellation board (client subscribe).
- [ ] **Step 2 — Observability.** PostHog (EU) events (signup, report, status view, notification) + Sentry errors; density KPIs dashboard (PRD §27.2). Add cookie consent for analytics.
- [ ] **Step 3 — Legal gate.** Replace placeholder Privacy/Terms with real copy (solicitor-reviewed per PRD §11.4), publish DPIA, processor agreements list. **Do not promote the app to real users until this clears.**

**Acceptance:** live feeds update without refresh; analytics/error events flow; Privacy/Terms are real + reviewed. **Verify:** manual realtime check; events visible in PostHog/Sentry; legal sign-off recorded.

---

## Task 9 — Test & compliance hardening  *(PRD §19, §20)*

- [ ] RLS integration tests (a user cannot read others' raw reports / write as someone else).
- [ ] Status-engine unit tests (table-driven vs §7 thresholds); scam-filter + rate-limit tests.
- [ ] Extend Playwright E2E to the full loop (onboard → follow → reminder → report → status → cancellation → moderation) against seeded data.
- [ ] Banned-phrase lint + a11y (WCAG AA) + Lighthouse pass; confirm every status surface shows the community-reported label.

**Acceptance:** Phase 1 DoD (PRD §19) met across increments. **Verify:** `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm check:compliance`, `pnpm build`, `pnpm --filter web test:e2e` all green.

---

## Stop Conditions (Phase 1 "done")

- Status engine writes `centre_status` + refreshes `centre_heatmap` on a schedule; app reads them.
- Reports are rate-limited, scam-filtered, and decay; bad/abusive data is caught and recorded.
- Moderation + sensitive actions are immutably audited.
- Trust scoring weights confidence and gates auto-publish.
- Users get manual reminder nudges; can export and delete their data (aggregates preserved).
- Notification tiers (free-delay vs premium-instant) work, modelled by `subscriptions`.
- Real Privacy/Terms reviewed; DPIA done; observability live.
- Full-loop E2E + RLS + rate-limit + scam + status-engine tests green.

## Out of scope (later phases)
- **Phase 1.5:** separate MFA-gated `apps/admin`.
- **Phase 2:** Expo mobile app + device-local reminders; instructor onboarding/verification.
- **Phase 3:** RevenueCat/Stripe billing wiring; advanced trust/auto-moderation.
- **Phase 4–5:** public SEO status pages at scale, instructor directory, referrals, LLM moderation, public API, national rollout.

## Risks
- **Status thresholds at low density** — keep in `packages/shared`, tune via KPIs.
- **Bad data erodes trust** — trust weighting + decay + confirmations are load-bearing, not optional.
- **Reminder/push reliability** — schedule + retry + delivery logging; never imply live availability.
- **GDPR deletion vs aggregate integrity** — anonymise authorship, don't hard-delete reports.
- **Legal gate** — the app is already publicly reachable; prioritise real Privacy/Terms.
