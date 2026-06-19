-- 0008_reminders.sql — Phase 1 Task 5: manual reminders (PRD §6.4).
--
-- The core nudge loop: a user picks times; a scheduler sends a web push at those
-- times saying "check GOV.UK yourself". COMPLIANCE: the server only schedules
-- clock times and pushes a manual-check nudge — it never logs into / polls / or
-- checks DVSA. No availability data is implied by a reminder.

-- ---------- reminder_preferences (one row per user) ----------
create table if not exists reminder_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  -- 24h local times, "HH:MM". Defaults: just before 6am release, lunch, evening.
  times text[] not null default array['05:55', '12:30', '20:30'],
  timezone text not null default 'Europe/London',
  enabled boolean not null default true,
  channels text[] not null default array['web_push'],
  updated_at timestamptz not null default now()
);

alter table reminder_preferences enable row level security;
drop policy if exists reminder_prefs_own_all on reminder_preferences;
create policy reminder_prefs_own_all on reminder_preferences
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- device_tokens (web push subscriptions) ----------
create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  subscription jsonb not null,           -- the browser PushSubscription
  endpoint text not null,                -- subscription.endpoint, for dedupe
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, endpoint)
);
create index if not exists device_tokens_user_idx on device_tokens (user_id);

alter table device_tokens enable row level security;
drop policy if exists device_tokens_own_all on device_tokens;
create policy device_tokens_own_all on device_tokens
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- reminder_deliveries (idempotency for the dispatcher) ----------
-- One row per user × time-slot × local day, so a 15-min cron never double-sends
-- a slot. The dispatcher inserts before sending; a unique violation = "already
-- sent today".
create table if not exists reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  slot text not null,        -- the matched "HH:MM"
  sent_on date not null,     -- local (Europe/London) date
  created_at timestamptz not null default now(),
  unique (user_id, slot, sent_on)
);

alter table reminder_deliveries enable row level security;
-- Written/read only by the service-role dispatcher; no client policy needed.
