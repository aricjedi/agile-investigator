-- =============================================================================
-- TrustQ — Initial Database Schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ORGANIZATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  created_at   timestamptz not null default now(),
  health_score integer,          -- nullable; populated by scoring engine (future)
  status       text not null default 'active'
                 check (status in ('active', 'inactive'))
);

comment on table public.organizations is
  'Top-level tenant record. Each paying customer maps to one organization.';

-- ---------------------------------------------------------------------------
-- 2. PROFILES
-- Links Supabase auth users to organizations and assigns roles.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role            text not null default 'viewer'
                    check (role in ('admin', 'client', 'viewer')),
  full_name       text not null default '',
  created_at      timestamptz not null default now(),

  unique (user_id)   -- one profile per auth user (cross-org support is a future feature)
);

comment on table public.profiles is
  'Extends auth.users with org membership and role. Created after signup.';

-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;

-- Helper: looks up an auth.users id by email address.
-- Called by the server-side org-creation action to check whether a Supabase
-- auth user already exists before attempting to create one.
-- Runs as security definer so the REST API never exposes auth.users directly.
create or replace function public.get_auth_user_id_by_email(email_address text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id
  from   auth.users
  where  email = lower(email_address)
  limit  1;
$$;

-- Helper: returns the organization_id of the currently authenticated user.
-- Used in RLS policies to avoid repeated subqueries.
create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select organization_id
  from   public.profiles
  where  user_id = auth.uid()
  limit  1;
$$;

-- --- organizations policies -------------------------------------------------

-- Users can only see their own organization.
create policy "org: users see own org"
  on public.organizations
  for select
  using (id = public.current_user_org_id());

-- Only admins can update their organization record.
create policy "org: admins update own org"
  on public.organizations
  for update
  using (
    id = public.current_user_org_id()
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Only the service-role key (server-side) can insert/delete organizations.
-- Application code uses the anon/user key, so insert/delete are locked down.
-- TODO: add admin-panel insert policy when org provisioning UI is built.

-- --- profiles policies ------------------------------------------------------

-- A user may SELECT a profile row if either:
--   (a) it is their own row (user_id = auth.uid()) — this covers admin users
--       who have no organization_id; null = null is SQL NULL (falsy) so the
--       org-based clause alone would block them from reading their own profile.
--   (b) the row belongs to their organization (org members visibility).
create policy "profile: users read own row or org members"
  on public.profiles
  for select
  using (
    user_id          = auth.uid()
    or organization_id = public.current_user_org_id()
  );

-- Users can update only their own profile.
create policy "profile: users update own profile"
  on public.profiles
  for update
  using (user_id = auth.uid());

-- Profiles are created server-side (service role) immediately after signup.
-- TODO: If self-service profile creation is needed, add an insert policy here.

-- ---------------------------------------------------------------------------
-- 4. AUTO-CREATE PROFILE TRIGGER (optional convenience)
-- Creates a skeleton profile when a new auth user is confirmed.
-- Organization assignment must still happen via admin provisioning flow.
-- ---------------------------------------------------------------------------

-- TODO: uncomment and wire to admin provisioning once org-assignment flow exists.
--
-- create or replace function public.handle_new_user()
-- returns trigger language plpgsql security definer as $$
-- begin
--   insert into public.profiles (user_id, organization_id, role, full_name)
--   values (new.id, '<default-org-id>', 'viewer', coalesce(new.raw_user_meta_data->>'full_name', ''));
--   return new;
-- end;
-- $$;
--
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. INDEXES
-- ---------------------------------------------------------------------------
create index if not exists profiles_user_id_idx   on public.profiles (user_id);
create index if not exists profiles_org_id_idx    on public.profiles (organization_id);
create index if not exists orgs_slug_idx          on public.organizations (slug);

-- ---------------------------------------------------------------------------
-- 6. ASSESSMENTS
-- See schema-assessment.sql for the full migration block (tables, RLS, indexes).
-- Kept here for reference; run schema-assessment.sql in the SQL Editor.
-- ---------------------------------------------------------------------------

-- assessments: one draft or complete assessment per org per attempt
create table if not exists public.assessments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by      uuid not null references public.profiles (id) on delete cascade,
  status          text not null default 'draft'
                    check (status in ('draft', 'complete')),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
  -- TODO: add version column when question set versioning is introduced
);

-- assessment_responses: one row per question per assessment, upserted on save
create table if not exists public.assessment_responses (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  dimension      text not null,
  question_index integer not null,
  question_text  text not null,
  score          integer not null check (score between 1 and 5),
  created_at     timestamptz not null default now(),
  unique (assessment_id, dimension, question_index)
);

-- dimension_scores: computed on submission, one row per dimension per assessment
create table if not exists public.dimension_scores (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  dimension      text not null,
  raw_score      numeric(5,4) not null,
  weighted_score numeric(7,6) not null,
  weight         numeric(4,3) not null,
  created_at     timestamptz not null default now(),
  unique (assessment_id, dimension)
);

alter table public.assessments          enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.dimension_scores     enable row level security;

-- RLS policies — see schema-assessment.sql for the full policy definitions.

create index if not exists assessments_org_id_idx      on public.assessments (organization_id);
create index if not exists assessments_org_status_idx  on public.assessments (organization_id, status);
create index if not exists responses_assessment_id_idx on public.assessment_responses (assessment_id);
create index if not exists dimscores_assessment_id_idx on public.dimension_scores (assessment_id);
