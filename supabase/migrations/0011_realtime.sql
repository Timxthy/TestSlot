-- 0011_realtime.sql — Phase 1 Task 8: live feeds (PRD §6.6 Realtime).
--
-- Adds the public-read tables to Supabase's realtime publication so the web app
-- can subscribe and refresh when they change:
--   * centre_status        — the centre page refreshes when the status engine
--                            recomputes (5-min cron, or on demand).
--   * cancellation_posts    — the board refreshes when a post is approved/added.
--
-- We expose ONLY tables whose RLS already permits client SELECT — never raw
-- availability_reports. centre_status is public-read (0005); cancellation_posts
-- has cancellations_public_read (0001) which limits clients to approved + active
-- rows. Realtime respects RLS, so the anon browser receives events only for rows
-- it is already allowed to read (a pending/rejected post never reaches it).
--
-- Idempotent: re-running is a no-op. Apply once in the live project; in mock mode
-- the client realtime code is inert (NEXT_PUBLIC_SUPABASE_* unset).

do $$
declare
  t text;
begin
  foreach t in array array['centre_status', 'cancellation_posts']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
