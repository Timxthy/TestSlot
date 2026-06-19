-- 0010_subscriptions.sql — Phase 1 Task 7: notification tiers (PRD §14, §6.13).
--
-- Models subscription tiers so the notification cron can throttle (free = delayed,
-- premium/instructor = instant) and the app can gate follow-count + heatmap. Tiers
-- are granted server-side only (billing webhooks land in Phase 3) — there is no
-- client write policy, so a user can never self-upgrade. Entitlements are derived
-- from `tier` in packages/shared/src/entitlements.ts (the source of truth).

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  tier text not null default 'free',
  provider text,                -- 'revenuecat' | 'stripe' | null (Phase 3)
  status text not null default 'active',
  current_period_end timestamptz,
  entitlements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- A user may read their own subscription; writes are service-role only.
drop policy if exists subscriptions_read_own on subscriptions;
create policy subscriptions_read_own on subscriptions
  for select to authenticated using (auth.uid() = user_id);
