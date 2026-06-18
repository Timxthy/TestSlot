-- 0004_moderation_and_flags.sql — Phase 1 Task 2: moderation integrity.
-- Immutable audit trail for moderation + sensitive actions, plus a flag log for
-- the write-time scam filter. Append-only from any client: only the service role
-- (server) writes; authenticated moderators may read; there are no insert/update/
-- delete policies, so RLS denies all client mutations.

create type moderation_target as enum (
  'cancellation_post', 'availability_report', 'profile', 'instructor_application'
);
create type content_flag_action as enum ('none', 'soft_warn', 'pending_review', 'blocked');

create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references profiles (id) on delete set null,
  target_type moderation_target not null,
  target_id text not null,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table content_flags (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id text,
  rule_matched text,
  severity text not null default 'low',
  auto_action content_flag_action not null default 'none',
  created_at timestamptz not null default now()
);

create index moderation_actions_target_idx on moderation_actions (target_type, target_id);
create index audit_logs_actor_created_idx on audit_logs (actor_id, created_at desc);
create index content_flags_content_idx on content_flags (content_type, content_id);

alter table moderation_actions enable row level security;
alter table audit_logs enable row level security;
alter table content_flags enable row level security;

-- Moderators+ may read; nobody (client-side) may insert/update/delete (append-only).
-- The service role bypasses RLS for server-side writes.
create policy moderation_actions_mod_read on moderation_actions
  for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid()
                 and p.role in ('moderator', 'admin', 'super_admin')));

create policy audit_logs_mod_read on audit_logs
  for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid()
                 and p.role in ('moderator', 'admin', 'super_admin')));

create policy content_flags_mod_read on content_flags
  for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid()
                 and p.role in ('moderator', 'admin', 'super_admin')));
