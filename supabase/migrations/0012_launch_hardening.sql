-- 0012_launch_hardening.sql — launch hardening safeguards.
--
-- Adds database-side enforcement for the highest-risk application checks:
--   * Auth signups create profiles even when email confirmation delays a session.
--   * Signup attempts use durable, atomic, bounded server-side buckets.
--   * Follow and daily submission caps hold under concurrent requests.
--   * Cancellation realtime publishes only bounded, content-free refresh pings.
--   * Notification delivery retries are claimed atomically before provider calls.

-- ---------- auth user -> profile ----------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, is_instructor_verified)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'name', ''),
    'learner',
    false
  )
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill any existing auth account that predates the trigger or whose earlier
-- application-level profile write failed. Existing profile fields win.
insert into public.profiles (id, display_name, role, is_instructor_verified)
select
  users.id,
  nullif(users.raw_user_meta_data->>'name', ''),
  'learner',
  false
from auth.users as users
on conflict (id) do update
  set display_name = coalesce(public.profiles.display_name, excluded.display_name);

-- ---------- auth attempt buckets ----------
create table if not exists public.auth_attempt_buckets (
  kind text not null check (kind in ('signup', 'login')),
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts int not null default 1 check (attempts > 0),
  updated_at timestamptz not null default now(),
  primary key (kind, identity_hash, window_start)
);

alter table public.auth_attempt_buckets
  alter column attempts set default 1;

create index if not exists auth_attempt_buckets_window_start_idx
  on public.auth_attempt_buckets (window_start);

alter table public.auth_attempt_buckets enable row level security;
revoke all on table public.auth_attempt_buckets
  from public, anon, authenticated;
grant select, insert, update, delete on table public.auth_attempt_buckets
  to service_role;

create or replace function public.consume_auth_attempt(
  p_kind text,
  p_identity_hash text,
  p_window_start timestamptz,
  p_max_attempts int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempts int;
begin
  if p_kind not in ('signup', 'login')
     or p_identity_hash !~ '^[0-9a-f]{64}$'
     or p_max_attempts < 1
     or p_max_attempts > 1000 then
    raise exception 'invalid auth attempt bucket input'
      using errcode = '22023';
  end if;

  -- Buckets are needed only for the active windows. Opportunistic cleanup keeps
  -- the table bounded without depending on a separate scheduler.
  delete from public.auth_attempt_buckets
  where window_start < pg_catalog.now() - interval '1 day';

  insert into public.auth_attempt_buckets (
    kind,
    identity_hash,
    window_start,
    attempts
  )
  values (p_kind, p_identity_hash, p_window_start, 1)
  on conflict (kind, identity_hash, window_start) do update
    set attempts = public.auth_attempt_buckets.attempts + 1,
        updated_at = pg_catalog.now()
  returning attempts into current_attempts;

  return current_attempts <= p_max_attempts;
end;
$$;

revoke execute on function public.consume_auth_attempt(text, text, timestamptz, int)
  from public, anon, authenticated;
grant execute on function public.consume_auth_attempt(text, text, timestamptz, int)
  to service_role;

-- ---------- public cancellation realtime refresh pings ----------
-- One row per public centre is enough to tell browsers to refresh. No post ID,
-- author, note, moderation state, or planned cancellation time is published.
create table if not exists public.cancellation_board_events (
  centre_slug text primary key references public.test_centres (slug) on delete cascade,
  changed_at timestamptz not null default now()
);

alter table public.cancellation_board_events enable row level security;
revoke all on table public.cancellation_board_events
  from public, anon, authenticated;
grant select on table public.cancellation_board_events
  to anon, authenticated;

drop policy if exists cancellation_board_events_public_read
  on public.cancellation_board_events;
create policy cancellation_board_events_public_read
  on public.cancellation_board_events
  for select to anon, authenticated
  using (true);

-- Keep normal board reads available over the Data API, but publish no raw
-- cancellation row through realtime. Owners may additionally read their own
-- pending/rejected rows.
drop policy if exists cancellations_public_read on public.cancellation_posts;
create policy cancellations_public_read on public.cancellation_posts
  for select
  using (moderation_status = 'approved' and status = 'active');

drop policy if exists cancellations_read_own on public.cancellation_posts;
create policy cancellations_read_own on public.cancellation_posts
  for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.record_cancellation_board_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_was_public boolean := false;
  new_is_public boolean := false;
begin
  if tg_op = 'DELETE' then
    old_was_public :=
      old.moderation_status = 'approved'
      and old.status = 'active'
      and old.expires_at > pg_catalog.now();

    if old_was_public then
      insert into public.cancellation_board_events (centre_slug, changed_at)
      values (old.centre_slug, pg_catalog.now())
      on conflict (centre_slug) do update
        set changed_at = excluded.changed_at;
    end if;
    return old;
  end if;

  new_is_public :=
    new.moderation_status = 'approved'
    and new.status = 'active'
    and new.expires_at > pg_catalog.now();

  if tg_op = 'UPDATE' then
    old_was_public :=
      old.moderation_status = 'approved'
      and old.status = 'active'
      and old.expires_at > pg_catalog.now();
  end if;

  -- Refresh the old centre when a visible post is hidden, deleted, expired, or
  -- moved. Avoid a duplicate ping when the visible centre is unchanged.
  if tg_op = 'UPDATE'
     and old_was_public
     and (
       not new_is_public
       or old.centre_slug is distinct from new.centre_slug
     ) then
    insert into public.cancellation_board_events (centre_slug, changed_at)
    values (old.centre_slug, pg_catalog.now())
    on conflict (centre_slug) do update
      set changed_at = excluded.changed_at;
  end if;

  if new_is_public then
    insert into public.cancellation_board_events (centre_slug, changed_at)
    values (new.centre_slug, pg_catalog.now())
    on conflict (centre_slug) do update
      set changed_at = excluded.changed_at;
  end if;

  return new;
end;
$$;

revoke execute on function public.record_cancellation_board_event()
  from public, anon, authenticated;

drop trigger if exists cancellation_board_event_insert
  on public.cancellation_posts;
create trigger cancellation_board_event_insert
  after insert on public.cancellation_posts
  for each row execute function public.record_cancellation_board_event();

drop trigger if exists cancellation_board_event_update
  on public.cancellation_posts;
create trigger cancellation_board_event_update
  after update of centre_slug, moderation_status, status, expires_at, planned_cancel_at
  on public.cancellation_posts
  for each row execute function public.record_cancellation_board_event();

drop trigger if exists cancellation_board_event_delete
  on public.cancellation_posts;
create trigger cancellation_board_event_delete
  after delete on public.cancellation_posts
  for each row execute function public.record_cancellation_board_event();

-- Give current boards a bounded initial row without exposing any post details.
insert into public.cancellation_board_events (centre_slug, changed_at)
select distinct centre_slug, pg_catalog.now()
from public.cancellation_posts
where moderation_status = 'approved'
  and status = 'active'
  and expires_at > pg_catalog.now()
on conflict (centre_slug) do update
  set changed_at = excluded.changed_at;

-- Supabase creates this publication. Guard it so schema-only PostgreSQL checks
-- can still apply the migration without inventing a publication.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cancellation_posts'
    ) then
      alter publication supabase_realtime
        drop table public.cancellation_posts;
    end if;

    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cancellation_board_events'
    ) then
      alter publication supabase_realtime
        add table public.cancellation_board_events;
    end if;
  end if;
end
$$;

-- ---------- notification delivery claim/recovery ----------
alter table public.notification_deliveries
  add column if not exists attempted_at timestamptz;

update public.notification_deliveries
set attempted_at = coalesce(sent_at, created_at)
where attempted_at is null;

alter table public.notification_deliveries
  alter column attempted_at set default now(),
  alter column attempted_at set not null;

create index if not exists notification_deliveries_retry_idx
  on public.notification_deliveries (status, attempted_at)
  where status in ('pending', 'failed');

create or replace function public.claim_notification_delivery(
  p_user_id uuid,
  p_centre_slug text,
  p_cancellation_post_id uuid,
  p_channel public.notification_channel,
  p_title text,
  p_body text,
  p_now timestamptz
)
returns table (
  delivery_id uuid,
  delivery_attempts int,
  delivery_title text,
  delivery_body text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
  claimed_attempts int;
  claimed_title text;
  claimed_body text;
begin
  if p_user_id is null
     or p_centre_slug is null
     or p_cancellation_post_id is null
     or p_title is null
     or p_body is null
     or p_now is null then
    raise exception 'invalid notification delivery claim input'
      using errcode = '22023';
  end if;

  insert into public.notification_deliveries as deliveries (
    user_id,
    centre_slug,
    cancellation_post_id,
    channel,
    status,
    title,
    body,
    attempts,
    attempted_at
  )
  values (
    p_user_id,
    p_centre_slug,
    p_cancellation_post_id,
    p_channel,
    'pending',
    p_title,
    p_body,
    1,
    p_now
  )
  on conflict (user_id, cancellation_post_id, channel)
    where cancellation_post_id is not null
  do nothing
  returning deliveries.id, deliveries.attempts, deliveries.title, deliveries.body
  into claimed_id, claimed_attempts, claimed_title, claimed_body;

  if claimed_id is not null then
    return query
      select claimed_id, claimed_attempts, claimed_title, claimed_body;
    return;
  end if;

  -- A failed delivery may be claimed immediately on the next scheduler run. A
  -- pending delivery is reclaimed only after its worker lease has gone stale.
  update public.notification_deliveries as deliveries
  set status = 'pending',
      attempts = deliveries.attempts + 1,
      error = null,
      attempted_at = p_now
  where deliveries.user_id = p_user_id
    and deliveries.cancellation_post_id = p_cancellation_post_id
    and deliveries.channel = p_channel
    and deliveries.attempts < 3
    and (
      deliveries.status = 'failed'
      or (
        deliveries.status = 'pending'
        and deliveries.attempted_at <= p_now - interval '10 minutes'
      )
    )
  returning deliveries.id, deliveries.attempts, deliveries.title, deliveries.body
  into claimed_id, claimed_attempts, claimed_title, claimed_body;

  if claimed_id is not null then
    return query
      select claimed_id, claimed_attempts, claimed_title, claimed_body;
  end if;
end;
$$;

revoke execute on function public.claim_notification_delivery(
  uuid, text, uuid, public.notification_channel, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.claim_notification_delivery(
  uuid, text, uuid, public.notification_channel, text, text, timestamptz
) to service_role;

-- ---------- follow cap enforcement ----------
create or replace function public.enforce_user_centre_follow_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_tier text := 'free';
  follow_limit int := 3;
  current_count int;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  -- Recheck after taking the per-user lock so concurrent duplicate upserts do
  -- not consume capacity or race the unique constraint.
  if exists (
    select 1 from public.user_centres
    where user_id = new.user_id
      and centre_slug = new.centre_slug
  ) then
    return new;
  end if;

  select coalesce(subscriptions.tier, 'free')
  into active_tier
  from public.subscriptions
  where subscriptions.user_id = new.user_id
    and subscriptions.status = 'active';

  follow_limit := case active_tier
    when 'premium' then 10
    when 'instructor' then 10
    else 3
  end;

  select count(*)
  into current_count
  from public.user_centres
  where user_id = new.user_id;

  if current_count >= follow_limit then
    raise exception 'follow_limit:%', follow_limit
      using errcode = 'TS001';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_user_centre_follow_limit()
  from public, anon, authenticated;

drop trigger if exists user_centres_follow_limit
  on public.user_centres;
create trigger user_centres_follow_limit
  before insert on public.user_centres
  for each row execute function public.enforce_user_centre_follow_limit();

-- ---------- daily submission cap enforcement ----------
create index if not exists cancellation_posts_user_created_idx
  on public.cancellation_posts (user_id, created_at desc);

create or replace function public.enforce_daily_submission_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap int;
  current_count int;
  score int := 0;
begin
  if new.user_id is null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      tg_table_name || ':' || new.user_id::text,
      0
    )
  );

  if tg_table_name = 'availability_reports' then
    select coalesce(profiles.trust_score, 0)
    into score
    from public.profiles
    where profiles.id = new.user_id;

    cap := case when score >= 70 then 30 else 5 end;

    select count(*)
    into current_count
    from public.availability_reports
    where user_id = new.user_id
      and created_at >= pg_catalog.now() - interval '24 hours';
  elsif tg_table_name = 'cancellation_posts' then
    cap := 3;

    select count(*)
    into current_count
    from public.cancellation_posts
    where user_id = new.user_id
      and created_at >= pg_catalog.now() - interval '24 hours';
  else
    return new;
  end if;

  if current_count >= cap then
    raise exception 'daily_rate_limit:%', cap
      using errcode = 'TS002';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_daily_submission_limit()
  from public, anon, authenticated;

drop trigger if exists availability_reports_daily_limit
  on public.availability_reports;
create trigger availability_reports_daily_limit
  before insert on public.availability_reports
  for each row execute function public.enforce_daily_submission_limit();

drop trigger if exists cancellation_posts_daily_limit
  on public.cancellation_posts;
create trigger cancellation_posts_daily_limit
  before insert on public.cancellation_posts
  for each row execute function public.enforce_daily_submission_limit();
