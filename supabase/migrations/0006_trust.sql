-- 0006_trust.sql — Phase 1 Task 4: trust scoring & confirmations (PRD §13).
--
-- Adds the confirmation feedback loop (`report_confirmations`), a scheduled trust
-- recompute that writes `profiles.trust_score`, and folds reporter trust +
-- confirmations into the status engine's confidence (PRD §7: confidence =
-- f(unique reporters × trust weights × recency)).
--
-- The trust model is documented in packages/shared/src/trust.ts; the SQL here
-- mirrors it and must be kept in sync.

-- ---------- report_confirmations (the "still there / not there" loop) ----------
create table if not exists report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references availability_reports (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  agrees boolean not null,
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);
create index if not exists report_confirmations_report_idx
  on report_confirmations (report_id);

alter table report_confirmations enable row level security;

-- A user manages only their own confirmation per report; aggregate effects are
-- surfaced via the engine (service role). No cross-user raw read.
drop policy if exists report_confirmations_insert_own on report_confirmations;
create policy report_confirmations_insert_own on report_confirmations
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists report_confirmations_update_own on report_confirmations;
create policy report_confirmations_update_own on report_confirmations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists report_confirmations_read_own on report_confirmations;
create policy report_confirmations_read_own on report_confirmations
  for select to authenticated using (auth.uid() = user_id);

-- ---------- trust_weight_for_score: mirror trustWeightForScore() ----------
create or replace function trust_weight_for_score(score int)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when score < 20 then 0.25  -- restricted
    when score < 35 then 0.5   -- watchlist
    when score < 50 then 0.75  -- new
    when score < 70 then 1.0   -- normal
    when score < 85 then 1.5   -- trusted
    else 2.0                   -- verified
  end;
$$;

-- ---------- recompute_trust_scores: mirror computeTrustScore() ----------
-- Writes profiles.trust_score from the inputs available in-DB (account age,
-- confirmed reports, instructor verification, posting rate). flags / abuse /
-- scam similarity are modelled in trust.ts but have no durable per-user source
-- yet, so they contribute 0 here (richer inputs are a later task).
create or replace function recompute_trust_scores()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update profiles p
  set trust_score = greatest(0, least(100, round(
        50
        + least(20, floor(extract(epoch from (now() - p.created_at)) / 86400.0 * 0.5))
        + least(20, coalesce(c.confirmed_reports, 0) * 2)
        + case when p.is_instructor_verified then 15 else 0 end
        - case when coalesce(r.posting_rate, 0) > 30 then 15 else 0 end
      )::int))
  from profiles p2
  left join (
    select ar.user_id, count(*) as confirmed_reports
    from report_confirmations rc
    join availability_reports ar on ar.id = rc.report_id
    where rc.agrees and ar.user_id is not null
    group by ar.user_id
  ) c on c.user_id = p2.id
  left join (
    select user_id, count(*)::numeric / 7.0 as posting_rate
    from availability_reports
    where user_id is not null and checked_at > now() - interval '7 days'
    group by user_id
  ) r on r.user_id = p2.id
  where p2.id = p.id;
$$;

revoke execute on function recompute_trust_scores() from public, anon, authenticated;

-- ---------- recompute_centre_status: trust-weighted, confirmation-adjusted ----------
-- Replaces 0005's confidence (which used a flat unique-reporter count) with:
--   confidence = round(Σ trust_weight(distinct reporter) × 12)
--                + active_now bonus + net-confirmation bonus, clamped 0–100.
-- Status thresholds are unchanged (still mirror STATUS_RULES in status.ts).
create or replace function recompute_centre_status()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  with live as (
    select id, centre_slug, user_id, report_type, checked_at
    from availability_reports
    where decays_at is null or decays_at > now()
  ),
  agg as (
    select
      c.slug as centre_slug,
      count(distinct r.user_id) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '60 minutes') as uniq_avail60,
      count(*) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '24 hours') as avail24,
      count(distinct r.user_id) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '24 hours') as uniq_avail24,
      count(*) filter (
        where r.report_type = 'no_tests_found'
          and r.checked_at > now() - interval '3 days') as notest3d,
      count(distinct r.user_id) filter (
        where r.report_type = 'no_tests_found'
          and r.checked_at > now() - interval '3 days') as uniq_notest3d,
      count(*) filter (
        where r.report_type in ('tests_available', 'cancellation_seen')
          and r.checked_at > now() - interval '3 days') as avail3d,
      count(*) filter (
        where r.report_type = 'queue_too_long'
          and r.checked_at > now() - interval '2 hours') as queue2h,
      count(*) filter (
        where r.report_type = 'govuk_error'
          and r.checked_at > now() - interval '2 hours') as error2h,
      count(*) filter (where r.checked_at > now() - interval '7 days') as reports7d,
      count(distinct r.user_id) filter (
        where r.checked_at > now() - interval '7 days') as uniq7d,
      max(r.checked_at) filter (
        where r.checked_at > now() - interval '7 days') as last_report_at
    from test_centres c
    left join live r on r.centre_slug = c.slug
    group by c.slug
  ),
  -- Σ trust weight across DISTINCT 7d reporters (default score 50 → weight 1.0,
  -- so a centre of all-normal reporters scores exactly like the old count).
  trust_by_centre as (
    select centre_slug, sum(trust_weight_for_score(trust_score)) as trust_sum
    from (
      select distinct r.centre_slug, r.user_id, coalesce(p.trust_score, 50) as trust_score
      from live r
      left join profiles p on p.id = r.user_id
      where r.user_id is not null
        and r.checked_at > now() - interval '7 days'
    ) distinct_reporters
    group by centre_slug
  ),
  -- Net agreement on the centre's live 7d reports.
  confirm_by_centre as (
    select r.centre_slug,
      count(*) filter (where rc.agrees) - count(*) filter (where not rc.agrees) as net_confirm
    from live r
    join report_confirmations rc on rc.report_id = r.id
    where r.checked_at > now() - interval '7 days'
    group by r.centre_slug
  ),
  scored as (
    select
      a.centre_slug,
      case
        when a.uniq_avail60 >= 3 then 'active_now'
        when a.avail24 >= 2 then 'recently_active'
        when a.queue2h >= 3 then 'high_queue'
        when a.error2h >= 3 then 'error'
        when a.notest3d >= 10 and a.uniq_notest3d >= 5 and a.avail3d = 0 then 'dry'
        when a.reports7d > 0 then 'quiet'
        else 'unclear'
      end as status,
      a.avail24, a.uniq_avail24, a.notest3d, a.last_report_at, a.reports7d,
      coalesce(t.trust_sum, 0) as trust_sum,
      coalesce(cf.net_confirm, 0) as net_confirm
    from agg a
    left join trust_by_centre t on t.centre_slug = a.centre_slug
    left join confirm_by_centre cf on cf.centre_slug = a.centre_slug
  )
  insert into centre_status (centre_slug, status, confidence, metrics, computed_at)
  select
    centre_slug,
    status,
    case
      when reports7d = 0 then 0
      else greatest(0, least(100,
             round(trust_sum * 12)::int
             + case when status = 'active_now' then 30 else 0 end
             + greatest(-20, least(20, net_confirm * 5))
           ))
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

-- ---------- schedule + initial run ----------
select cron.schedule(
  'recompute-trust-scores', '7 3 * * *',  -- daily 03:07
  $$select recompute_trust_scores();$$
);

select recompute_trust_scores();
select recompute_centre_status();
