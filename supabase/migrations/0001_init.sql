-- TestSlot Radar — Phase 1 core schema.
-- Centres are referenced by slug (text) to match the app's slug-centric model.
-- NOTE: raw report reads are public here for the prototype; production should
-- expose only aggregates/own rows (see policy comments).

-- ---------- enums ----------
create type report_type as enum (
  'no_tests_found', 'tests_available', 'cancellation_seen',
  'queue_too_long', 'govuk_error', 'other'
);
create type moderation_status as enum ('approved', 'pending', 'rejected');
create type user_role as enum ('learner', 'instructor', 'moderator', 'admin', 'super_admin');

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  postcode_area text,
  role user_role not null default 'learner',
  is_instructor_verified boolean not null default false,
  trust_score int not null default 50,
  created_at timestamptz not null default now()
);

-- ---------- test_centres ----------
create table test_centres (
  slug text primary key,
  name text not null,
  county text,
  postcode_area text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- user_centres (follows) ----------
create table user_centres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  centre_slug text not null references test_centres (slug) on delete cascade,
  priority int default 1,
  notification_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, centre_slug)
);

-- ---------- availability_reports ----------
create table availability_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  centre_slug text not null references test_centres (slug) on delete cascade,
  report_type report_type not null,
  checked_at timestamptz not null,
  earliest_month text,
  time_band text,
  confidence int not null default 50,
  note text,
  decays_at timestamptz,
  created_at timestamptz not null default now()
);
create index availability_reports_centre_checked_idx
  on availability_reports (centre_slug, checked_at desc);
create index availability_reports_user_created_idx
  on availability_reports (user_id, created_at);

-- ---------- cancellation_posts ----------
create table cancellation_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  centre_slug text not null references test_centres (slug) on delete cascade,
  author_name text not null,
  is_instructor boolean not null default false,
  planned_cancel_at timestamptz not null,
  test_month text,
  note text,
  status text not null default 'active',
  moderation_status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index cancellation_posts_centre_idx
  on cancellation_posts (centre_slug, status, expires_at);

-- ---------- waitlist ----------
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  postcode_area text,
  role text,
  interested_centres text[],
  consented boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table test_centres enable row level security;
alter table user_centres enable row level security;
alter table availability_reports enable row level security;
alter table cancellation_posts enable row level security;
alter table waitlist enable row level security;

-- Centres are public read.
create policy centres_public_read on test_centres for select using (true);

-- Profiles: a user can see and edit only their own.
create policy profiles_own_read on profiles for select using (auth.uid() = id);
create policy profiles_own_update on profiles for update using (auth.uid() = id);

-- Follows: a user manages only their own.
create policy follows_own_all on user_centres for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports: insert your own; read is open for the prototype.
-- PRODUCTION: replace the broad select with an aggregate view + own-rows policy.
create policy reports_insert_own on availability_reports for insert
  with check (auth.uid() = user_id);
create policy reports_read on availability_reports for select using (true);

-- Cancellations: insert your own; public can read only approved + active.
create policy cancellations_insert_own on cancellation_posts for insert
  with check (auth.uid() = user_id);
create policy cancellations_public_read on cancellation_posts for select
  using (moderation_status = 'approved' and status = 'active');

-- Waitlist: writes go through the server (service role); no public policy.
