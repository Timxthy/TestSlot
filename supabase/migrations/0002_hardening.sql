-- 0002_hardening.sql — tighten RLS after the initial prototype schema (0001).
-- Apply via the Supabase MCP or the dashboard SQL editor.

-- (2) Profiles: a user may update only safe columns on their own row.
--     role / is_instructor_verified / trust_score become service-role-only.
drop policy if exists profiles_own_update on profiles;

revoke update on profiles from authenticated;
grant update (display_name, postcode_area) on profiles to authenticated;

create policy profiles_self_safe_update on profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- (3) Reports: remove public raw read. Authenticated users may read only their
--     own raw rows; aggregates (status / heatmap / feed) are computed
--     server-side via the service role, never exposed as raw rows to clients.
drop policy if exists reports_read on availability_reports;

create policy reports_read_own on availability_reports
  for select to authenticated
  using (auth.uid() = user_id);
