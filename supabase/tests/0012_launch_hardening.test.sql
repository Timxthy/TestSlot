\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if condition is not true then
    raise exception 'assertion failed: %', message;
  end if;
end;
$$;

-- ---------- schema, backfill, RLS and grants ----------
select pg_temp.assert_true(
  exists (
    select 1
    from pg_catalog.pg_class
    where oid = 'public.auth_attempt_buckets'::regclass
      and relrowsecurity
  ),
  'auth_attempt_buckets must have RLS enabled'
);

select pg_temp.assert_true(
  (
    select column_default = '1'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'auth_attempt_buckets'
      and column_name = 'attempts'
  ),
  'auth attempt buckets must default to a valid first attempt'
);

select pg_temp.assert_true(
  exists (
    select 1
    from pg_catalog.pg_class
    where oid = 'public.cancellation_board_events'::regclass
      and relrowsecurity
  ),
  'cancellation_board_events must have RLS enabled'
);

select pg_temp.assert_true(
  (
    select array_agg(column_name::text order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cancellation_board_events'
  ) = array['centre_slug', 'changed_at'],
  'realtime events must contain only centre_slug and changed_at'
);

select pg_temp.assert_true(
  not pg_catalog.has_table_privilege(
    'anon',
    'public.auth_attempt_buckets',
    'SELECT'
  ),
  'anon must not read auth attempt buckets'
);

select pg_temp.assert_true(
  pg_catalog.has_table_privilege(
    'anon',
    'public.cancellation_board_events',
    'SELECT'
  )
  and not pg_catalog.has_table_privilege(
    'anon',
    'public.cancellation_board_events',
    'INSERT'
  ),
  'anon must have read-only access to cancellation refresh pings'
);

select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.consume_auth_attempt(text,text,timestamptz,integer)',
    'EXECUTE'
  )
  and pg_catalog.has_function_privilege(
    'service_role',
    'public.consume_auth_attempt(text,text,timestamptz,integer)',
    'EXECUTE'
  ),
  'auth bucket consume must be service-role-only'
);

select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'public.claim_notification_delivery(uuid,text,uuid,public.notification_channel,text,text,timestamptz)',
    'EXECUTE'
  )
  and pg_catalog.has_function_privilege(
    'service_role',
    'public.claim_notification_delivery(uuid,text,uuid,public.notification_channel,text,text,timestamptz)',
    'EXECUTE'
  ),
  'notification claim must be service-role-only'
);

select pg_temp.assert_true(
  exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'cancellation_posts'
      and policyname = 'cancellations_public_read'
  ),
  'approved cancellation board reads must remain available'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cancellation_posts'
  )
  and exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cancellation_board_events'
  ),
  'raw cancellation posts must be replaced by content-free realtime pings'
);

-- Upgrade-path fixtures use these IDs. Existing values must win and a missing
-- profile must be backfilled.
select pg_temp.assert_true(
  not exists (
    select 1
    from auth.users
    where id = '00000000-0000-0000-0000-000000000901'
  )
  or exists (
    select 1
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000901'
      and display_name = 'Existing profile'
  ),
  'existing profiles must not be overwritten during backfill'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from auth.users
    where id = '00000000-0000-0000-0000-000000000902'
  )
  or exists (
    select 1
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000902'
      and display_name = 'Backfilled user'
  ),
  'missing profiles must be backfilled from auth metadata'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.cancellation_posts
    where id = '90000000-0000-0000-0000-000000000001'
  )
  or exists (
    select 1
    from public.cancellation_board_events
    where centre_slug = 'upgrade-existing-centre'
  ),
  'existing visible cancellation rows must receive a bounded refresh ping'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.notification_deliveries
    where id = '90000000-0000-0000-0000-000000000002'
  )
  or exists (
    select 1
    from public.notification_deliveries
    where id = '90000000-0000-0000-0000-000000000002'
      and attempted_at = created_at
  ),
  'existing delivery rows must receive a deterministic attempted_at backfill'
);

-- ---------- deterministic fixtures ----------
insert into public.test_centres (slug, name, active)
select 'migration-centre-' || n, 'Migration Centre ' || n, true
from generate_series(1, 8) as n
on conflict (slug) do nothing;

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'migration-101@example.test',
    '{"name":"Migration User 101"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'migration-102@example.test',
    '{"name":"Migration User 102"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    'migration-103@example.test',
    '{"name":"Migration User 103"}'::jsonb
  )
on conflict (id) do nothing;

select pg_temp.assert_true(
  (
    select display_name
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000101'
  ) = 'Migration User 101',
  'new auth users must receive a profile from the trigger'
);

-- ---------- durable bounded auth buckets ----------
delete from public.auth_attempt_buckets
where identity_hash in (repeat('a', 64), repeat('b', 64));

insert into public.auth_attempt_buckets (
  kind,
  identity_hash,
  window_start,
  attempts
)
values (
  'signup',
  repeat('b', 64),
  pg_catalog.now() - interval '2 days',
  1
);

select pg_temp.assert_true(
  public.consume_auth_attempt(
    'signup',
    repeat('a', 64),
    date_trunc('hour', pg_catalog.now()),
    3
  ),
  'first auth attempt should be allowed'
);
select public.consume_auth_attempt(
  'signup',
  repeat('a', 64),
  date_trunc('hour', pg_catalog.now()),
  3
);
select public.consume_auth_attempt(
  'signup',
  repeat('a', 64),
  date_trunc('hour', pg_catalog.now()),
  3
);
select pg_temp.assert_true(
  not public.consume_auth_attempt(
    'signup',
    repeat('a', 64),
    date_trunc('hour', pg_catalog.now()),
    3
  ),
  'attempt above the cap should be rejected atomically'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.auth_attempt_buckets
    where identity_hash = repeat('b', 64)
  ),
  'auth attempt cleanup must remove buckets older than one day'
);

-- ---------- realtime visibility transitions ----------
insert into public.cancellation_posts (
  id,
  user_id,
  centre_slug,
  author_name,
  is_instructor,
  planned_cancel_at,
  status,
  moderation_status,
  approved_at,
  expires_at
)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'migration-centre-1',
  'Migration User 101',
  false,
  pg_catalog.now() + interval '2 hours',
  'active',
  'approved',
  pg_catalog.now(),
  pg_catalog.now() + interval '3 hours'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.cancellation_board_events
    where centre_slug = 'migration-centre-1'
  ),
  'visible cancellation insert must emit a refresh ping'
);

update public.cancellation_board_events
set changed_at = '2000-01-01T00:00:00Z'
where centre_slug = 'migration-centre-1';

update public.cancellation_posts
set moderation_status = 'rejected'
where id = '10000000-0000-0000-0000-000000000001';

select pg_temp.assert_true(
  (
    select changed_at > '2000-01-01T00:00:00Z'
    from public.cancellation_board_events
    where centre_slug = 'migration-centre-1'
  ),
  'hiding a visible cancellation must emit a refresh ping'
);

update public.cancellation_posts
set moderation_status = 'approved'
where id = '10000000-0000-0000-0000-000000000001';

update public.cancellation_board_events
set changed_at = '2000-01-01T00:00:00Z'
where centre_slug = 'migration-centre-1';

delete from public.cancellation_posts
where id = '10000000-0000-0000-0000-000000000001';

select pg_temp.assert_true(
  (
    select changed_at > '2000-01-01T00:00:00Z'
    from public.cancellation_board_events
    where centre_slug = 'migration-centre-1'
  ),
  'deleting a visible cancellation must emit a refresh ping'
);

-- ---------- follow and rolling daily caps ----------
insert into public.user_centres (user_id, centre_slug)
values
  ('00000000-0000-0000-0000-000000000101', 'migration-centre-1'),
  ('00000000-0000-0000-0000-000000000101', 'migration-centre-2'),
  ('00000000-0000-0000-0000-000000000101', 'migration-centre-3');

do $$
begin
  begin
    insert into public.user_centres (user_id, centre_slug)
    values (
      '00000000-0000-0000-0000-000000000101',
      'migration-centre-4'
    );
    raise exception 'follow cap did not reject the fourth centre';
  exception
    when sqlstate 'TS001' then null;
  end;
end
$$;

insert into public.availability_reports (
  user_id,
  centre_slug,
  report_type,
  checked_at,
  created_at
)
select
  '00000000-0000-0000-0000-000000000101',
  'migration-centre-1',
  'no_tests_found',
  pg_catalog.now(),
  pg_catalog.now()
from generate_series(1, 5);

do $$
begin
  begin
    insert into public.availability_reports (
      user_id,
      centre_slug,
      report_type,
      checked_at
    )
    values (
      '00000000-0000-0000-0000-000000000101',
      'migration-centre-1',
      'no_tests_found',
      pg_catalog.now()
    );
    raise exception 'report cap did not reject the sixth report';
  exception
    when sqlstate 'TS002' then null;
  end;
end
$$;

insert into public.cancellation_posts (
  id,
  user_id,
  centre_slug,
  author_name,
  is_instructor,
  planned_cancel_at,
  status,
  moderation_status,
  approved_at,
  expires_at
)
select
  ('20000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000102',
  'migration-centre-2',
  'Migration User 102',
  false,
  pg_catalog.now() + interval '2 hours',
  'active',
  'approved',
  pg_catalog.now(),
  pg_catalog.now() + interval '3 hours'
from generate_series(1, 3) as n;

do $$
begin
  begin
    insert into public.cancellation_posts (
      user_id,
      centre_slug,
      author_name,
      is_instructor,
      planned_cancel_at,
      status,
      moderation_status,
      approved_at,
      expires_at
    )
    values (
      '00000000-0000-0000-0000-000000000102',
      'migration-centre-2',
      'Migration User 102',
      false,
      pg_catalog.now() + interval '2 hours',
      'active',
      'approved',
      pg_catalog.now(),
      pg_catalog.now() + interval '3 hours'
    );
    raise exception 'cancellation cap did not reject the fourth post';
  exception
    when sqlstate 'TS002' then null;
  end;
end
$$;

-- ---------- atomic notification claim and recovery ----------
do $$
declare
  post_one uuid := '20000000-0000-0000-0000-000000000001';
  post_two uuid := '20000000-0000-0000-0000-000000000002';
  claimed int;
  attempt_count int;
  delivery uuid;
begin
  select count(*), max(delivery_attempts), max(delivery_id::text)::uuid
  into claimed, attempt_count, delivery
  from public.claim_notification_delivery(
    '00000000-0000-0000-0000-000000000101',
    'migration-centre-2',
    post_one,
    'email',
    'Migration title',
    'Migration body',
    pg_catalog.now()
  );
  if claimed <> 1 or attempt_count <> 1 then
    raise exception 'new notification delivery was not claimed exactly once';
  end if;

  select count(*)
  into claimed
  from public.claim_notification_delivery(
    '00000000-0000-0000-0000-000000000101',
    'migration-centre-2',
    post_one,
    'email',
    'Migration title',
    'Migration body',
    pg_catalog.now()
  );
  if claimed <> 0 then
    raise exception 'fresh pending notification was claimed twice';
  end if;

  update public.notification_deliveries
  set attempted_at = pg_catalog.now() - interval '11 minutes'
  where id = delivery;

  select count(*), max(delivery_attempts)
  into claimed, attempt_count
  from public.claim_notification_delivery(
    '00000000-0000-0000-0000-000000000101',
    'migration-centre-2',
    post_one,
    'email',
    'Changed title is ignored on retry',
    'Changed body is ignored on retry',
    pg_catalog.now()
  );
  if claimed <> 1 or attempt_count <> 2 then
    raise exception 'stale pending notification was not reclaimed';
  end if;

  select count(*), max(delivery_id::text)::uuid
  into claimed, delivery
  from public.claim_notification_delivery(
    '00000000-0000-0000-0000-000000000103',
    'migration-centre-2',
    post_two,
    'email',
    'Sent title',
    'Sent body',
    pg_catalog.now()
  );
  if claimed <> 1 then
    raise exception 'second notification was not claimed';
  end if;

  update public.notification_deliveries
  set status = 'sent', sent_at = pg_catalog.now()
  where id = delivery;

  select count(*)
  into claimed
  from public.claim_notification_delivery(
    '00000000-0000-0000-0000-000000000103',
    'migration-centre-2',
    post_two,
    'email',
    'Sent title',
    'Sent body',
    pg_catalog.now()
  );
  if claimed <> 0 then
    raise exception 'sent notification was reclaimed';
  end if;
end
$$;

select '0012 launch hardening assertions passed' as result;
