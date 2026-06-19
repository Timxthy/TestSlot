-- 0005_status_engine.sql — Phase 1 Task 3: durable status engine (PRD §7).
--
-- Moves centre status + the availability heatmap from "computed on every read in
-- the app" to durable, engine-written tables refreshed on a schedule. The app
-- read paths switch to reading `centre_status` / `centre_heatmap` instead of
-- aggregating raw reports per request (PRD §7.6: "no client-trusted computation").
--
-- Thresholds mirror `packages/shared/src/status.ts` (STATUS_RULES), which stays
-- the documented source of truth. The SQL below must be kept in sync with it.
-- Decayed rows (`decays_at <= now()`) are excluded from the status decision so a
-- centre flips active_now → quiet once its fresh availability reports expire.

-- ---------- centre_status (engine-written, public read) ----------
create table if not exists centre_status (
  centre_slug text primary key references test_centres (slug) on delete cascade,
  status text not null
    check (status in (
      'active_now', 'recently_active', 'high_queue', 'error', 'dry', 'quiet', 'unclear'
    )),
  confidence int not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

alter table centre_status enable row level security;

-- Aggregate status is public (mirrors test_centres). Engine writes via the
-- security-definer recompute function / service role, both of which bypass RLS;
-- there is deliberately no client insert/update/delete policy.
drop policy if exists centre_status_public_read on centre_status;
create policy centre_status_public_read on centre_status for select using (true);

-- ---------- band_for_hour: mirror packages/shared bandForHour() ----------
create or replace function band_for_hour(h int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when h < 8  then 'early_morning'
    when h < 12 then 'morning'
    when h < 17 then 'afternoon'
    else 'evening'
  end;
$$;

-- ---------- centre_heatmap (materialized view) ----------
-- Availability reports bucketed by centre × day-of-week × time band × type over
-- the last 14 days, with both raw and unique-reporter counts (the latter feeds
-- trust-weighting in Task 4). Day/hour are bucketed in Europe/London so the grid
-- matches what UK learners experience. Not decay-filtered: this is a historical
-- "when have tests appeared" pattern, not live status.
drop materialized view if exists centre_heatmap;
create materialized view centre_heatmap as
  select
    centre_slug,
    extract(dow from (checked_at at time zone 'Europe/London'))::int as dow,
    coalesce(
      time_band,
      band_for_hour(extract(hour from (checked_at at time zone 'Europe/London'))::int)
    ) as time_band,
    report_type,
    count(*)::int as report_count,
    count(distinct user_id)::int as unique_reporters
  from availability_reports
  where report_type in ('tests_available', 'cancellation_seen')
    and checked_at > now() - interval '14 days'
  group by 1, 2, 3, 4;

-- Unique index is required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
create unique index if not exists centre_heatmap_pk
  on centre_heatmap (centre_slug, dow, time_band, report_type);
create index if not exists centre_heatmap_centre_idx
  on centre_heatmap (centre_slug);

-- The app reads the heatmap only via the service role (getServiceStore). Supabase
-- default privileges auto-grant new relations to anon/authenticated, so revoke
-- those and keep service_role only — the MV isn't exposed over the Data API
-- (materialized views can't enforce RLS).
revoke all on centre_heatmap from anon, authenticated;
grant select on centre_heatmap to service_role;

-- ---------- recompute_centre_status() ----------
-- Recomputes every centre's durable status row. Mirrors computeCentreStatus()
-- in packages/shared/src/status.ts exactly (status ordering + thresholds +
-- confidence). Excludes decayed reports from the live signal.
create or replace function recompute_centre_status()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  with live as (
    select centre_slug, user_id, report_type, checked_at
    from availability_reports
    where decays_at is null or decays_at > now()
  ),
  agg as (
    select
      c.slug as centre_slug,
      -- active_now: >=3 unique reporters of availability in 60 min
      count(distinct r.user_id) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '60 minutes') as uniq_avail60,
      -- recently_active: >=2 availability reports in 24h
      count(*) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '24 hours') as avail24,
      count(distinct r.user_id) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '24 hours') as uniq_avail24,
      -- dry: >=10 no_tests_found from >=5 unique reporters in 3d, no availability in 3d
      count(*) filter (
        where r.report_type = 'no_tests_found'
          and r.checked_at > now() - interval '3 days') as notest3d,
      count(distinct r.user_id) filter (
        where r.report_type = 'no_tests_found'
          and r.checked_at > now() - interval '3 days') as uniq_notest3d,
      count(*) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '3 days') as avail3d,
      -- high_queue / error: >=3 of that type in 2h
      count(*) filter (
        where r.report_type = 'queue_too_long'
          and r.checked_at > now() - interval '2 hours') as queue2h,
      count(*) filter (
        where r.report_type = 'govuk_error'
          and r.checked_at > now() - interval '2 hours') as error2h,
      -- 7d totals drive confidence + quiet fallback
      count(*) filter (where r.checked_at > now() - interval '7 days') as reports7d,
      count(distinct r.user_id) filter (
        where r.checked_at > now() - interval '7 days') as uniq7d,
      max(r.checked_at) filter (
        where r.checked_at > now() - interval '7 days') as last_report_at
    from test_centres c
    left join live r on r.centre_slug = c.slug
    group by c.slug
  ),
  scored as (
    select
      centre_slug,
      case
        when uniq_avail60 >= 3 then 'active_now'
        when avail24 >= 2 then 'recently_active'
        when queue2h >= 3 then 'high_queue'
        when error2h >= 3 then 'error'
        when notest3d >= 10 and uniq_notest3d >= 5 and avail3d = 0 then 'dry'
        when reports7d > 0 then 'quiet'
        else 'unclear'
      end as status,
      avail24, uniq_avail24, notest3d, last_report_at, reports7d, uniq7d
    from agg
  )
  insert into centre_status (centre_slug, status, confidence, metrics, computed_at)
  select
    centre_slug,
    status,
    case
      when reports7d = 0 then 0
      else least(100, (uniq7d * 12) + case when status = 'active_now' then 30 else 0 end)
    end,
    jsonb_build_object(
      'availabilityReports24h', avail24,
      'uniqueReporters24h', uniq_avail24,
      'noTestReports3d', notest3d,
      'lastReportAt', last_report_at,
      'totalReports7d', reports7d
    ),
    now()
  from scored
  on conflict (centre_slug) do update set
    status = excluded.status,
    confidence = excluded.confidence,
    metrics = excluded.metrics,
    computed_at = excluded.computed_at;
$$;

-- Cron (postgres) and the service role invoke this; it must not be a public RPC.
revoke execute on function recompute_centre_status() from public, anon, authenticated;

-- Populate immediately so reads are correct before the first cron tick.
select recompute_centre_status();

-- ---------- schedule (pg_cron) ----------
-- DB-internal recompute/refresh/cleanup. Outbound work that needs app env
-- (notifications, reminders) runs from Netlify Scheduled Functions, not here.
create extension if not exists pg_cron;

-- Named schedules are idempotent: re-running replaces the existing job.
select cron.schedule(
  'recompute-centre-status', '*/5 * * * *',
  $$select recompute_centre_status();$$
);
select cron.schedule(
  'refresh-centre-heatmap', '*/5 * * * *',
  $$refresh materialized view concurrently centre_heatmap;$$
);
-- Retention purge: drop reports older than the longest read window (14d heatmap
-- + 7d metrics, with margin). We DON'T delete on decays_at — decay is enforced by
-- the recompute filter above; deleting decayed rows would gut the 14d heatmap and
-- 7d metrics within hours. This only reclaims genuinely stale data.
select cron.schedule(
  'purge-old-reports', '17 */6 * * *',
  $$delete from availability_reports where checked_at < now() - interval '30 days';$$
);
