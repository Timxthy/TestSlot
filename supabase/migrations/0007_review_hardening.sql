-- 0007_review_hardening.sql — fixes from the Phase 1 code review.
--
-- 1. report_confirmations: reject self-confirmation at the DB level so a user
--    can't farm trust/confidence by agreeing with their own reports.
-- 2. recompute_centre_status: exclude restricted/banned reporters (trust < 20)
--    from the live signal, so a gated user can't move a centre's status.
-- 3. moderation_actions / audit_logs: enforce append-only (no UPDATE/DELETE for
--    any API role, and a trigger that blocks it even for the service role),
--    making the audit trail genuinely immutable (plan Task 2 follow-through).

-- ---------- 1. no self-confirmation ----------
create or replace function reject_self_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from availability_reports ar
    where ar.id = new.report_id and ar.user_id = new.user_id
  ) then
    raise exception 'cannot confirm your own report'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
-- Trigger functions must not be callable as RPCs (doesn't affect trigger firing).
revoke execute on function reject_self_confirmation() from public, anon, authenticated;

drop trigger if exists report_confirmations_no_self on report_confirmations;
create trigger report_confirmations_no_self
  before insert or update on report_confirmations
  for each row execute function reject_self_confirmation();

-- ---------- 2. gated reporters don't move status ----------
-- Identical to 0006's engine except the `live` CTE drops reports from reporters
-- whose current trust is restricted/banned (score < 20). Their reports still
-- exist (flagged pending_review) but no longer count toward status, confidence,
-- or confirmations.
create or replace function recompute_centre_status()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  with live as (
    select r.id, r.centre_slug, r.user_id, r.report_type, r.checked_at
    from availability_reports r
    left join profiles p on p.id = r.user_id
    where (r.decays_at is null or r.decays_at > now())
      and (r.user_id is null or coalesce(p.trust_score, 50) >= 20)
  ),
  agg as (
    select
      c.slug as centre_slug,
      count(distinct r.user_id) filter (where r.report_type in ('tests_available','cancellation_seen') and r.checked_at > now() - interval '60 minutes') as uniq_avail60,
      count(*) filter (where r.report_type in ('tests_available','cancellation_seen') and r.checked_at > now() - interval '24 hours') as avail24,
      count(distinct r.user_id) filter (where r.report_type in ('tests_available','cancellation_seen') and r.checked_at > now() - interval '24 hours') as uniq_avail24,
      count(*) filter (where r.report_type = 'no_tests_found' and r.checked_at > now() - interval '3 days') as notest3d,
      count(distinct r.user_id) filter (where r.report_type = 'no_tests_found' and r.checked_at > now() - interval '3 days') as uniq_notest3d,
      count(*) filter (where r.report_type in ('tests_available','cancellation_seen') and r.checked_at > now() - interval '3 days') as avail3d,
      count(*) filter (where r.report_type = 'queue_too_long' and r.checked_at > now() - interval '2 hours') as queue2h,
      count(*) filter (where r.report_type = 'govuk_error' and r.checked_at > now() - interval '2 hours') as error2h,
      count(*) filter (where r.checked_at > now() - interval '7 days') as reports7d,
      count(distinct r.user_id) filter (where r.checked_at > now() - interval '7 days') as uniq7d,
      max(r.checked_at) filter (where r.checked_at > now() - interval '7 days') as last_report_at
    from test_centres c
    left join live r on r.centre_slug = c.slug
    group by c.slug
  ),
  trust_by_centre as (
    select centre_slug, sum(trust_weight_for_score(trust_score)) as trust_sum
    from (
      select distinct r.centre_slug, r.user_id, coalesce(p.trust_score, 50) as trust_score
      from live r left join profiles p on p.id = r.user_id
      where r.user_id is not null and r.checked_at > now() - interval '7 days'
    ) distinct_reporters
    group by centre_slug
  ),
  confirm_by_centre as (
    select r.centre_slug,
      count(*) filter (where rc.agrees) - count(*) filter (where not rc.agrees) as net_confirm
    from live r join report_confirmations rc on rc.report_id = r.id
    where r.checked_at > now() - interval '7 days'
    group by r.centre_slug
  ),
  scored as (
    select a.centre_slug,
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
  select centre_slug, status,
    case when reports7d = 0 then 0
      else greatest(0, least(100,
        round(trust_sum * 12)::int
        + case when status = 'active_now' then 30 else 0 end
        + greatest(-20, least(20, net_confirm * 5))))
    end,
    jsonb_build_object('availabilityReports24h', avail24, 'uniqueReporters24h', uniq_avail24,
      'noTestReports3d', notest3d, 'lastReportAt', last_report_at, 'totalReports7d', reports7d),
    now()
  from scored
  on conflict (centre_slug) do update set
    status = excluded.status, confidence = excluded.confidence,
    metrics = excluded.metrics, computed_at = excluded.computed_at;
$$;

-- ---------- 3. genuinely immutable audit trail ----------
create or replace function block_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'restrict_violation';
end;
$$;
revoke execute on function block_mutation() from public, anon, authenticated;

drop trigger if exists moderation_actions_append_only on moderation_actions;
create trigger moderation_actions_append_only
  before update or delete on moderation_actions
  for each statement execute function block_mutation();

drop trigger if exists audit_logs_append_only on audit_logs;
create trigger audit_logs_append_only
  before update or delete on audit_logs
  for each statement execute function block_mutation();

-- Belt and braces: no API role gets UPDATE/DELETE either.
revoke update, delete on moderation_actions from anon, authenticated, service_role;
revoke update, delete on audit_logs from anon, authenticated, service_role;

select recompute_centre_status();
