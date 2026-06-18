-- 0003_notification_deliveries.sql — DRAFT for Chunk B (notification delivery).
-- ⚠️ NOT YET APPLIED. Review, then apply via the Supabase MCP or dashboard SQL editor.
--
-- Records each outbound notification so the delivery cron is idempotent (dedupe)
-- and users get an auditable history. COMPLIANCE: rows are only ever created from
-- user-submitted, moderated community events (cancellation_posts) — never from
-- scanning or polling DVSA. See [[testslot-radar-compliance-boundary]].

create type notification_channel as enum ('email', 'web_push');
create type delivery_status as enum ('pending', 'sent', 'failed', 'skipped');

create table notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  centre_slug text not null references test_centres (slug) on delete cascade,
  -- The community event that triggered this. Nullable so history survives if the
  -- source post is later removed (on delete set null).
  cancellation_post_id uuid references cancellation_posts (id) on delete set null,
  channel notification_channel not null default 'email',
  status delivery_status not null default 'pending',
  title text not null,
  body text not null,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Idempotency: at most one delivery per user, per source event, per channel.
-- The cron upserts on this key so re-runs never double-send.
create unique index notification_deliveries_dedupe
  on notification_deliveries (user_id, cancellation_post_id, channel)
  where cancellation_post_id is not null;

create index notification_deliveries_user_created_idx
  on notification_deliveries (user_id, created_at desc);

-- RLS: a user may read only their own delivery history. All writes go through the
-- service role (the scheduled function) — there is no client insert/update policy.
alter table notification_deliveries enable row level security;

create policy deliveries_read_own on notification_deliveries
  for select to authenticated
  using (auth.uid() = user_id);
