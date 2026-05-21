-- =============================================================================
-- TrustQ — Assessment Schema Migration
-- Run this in the Supabase SQL Editor after schema.sql has been applied.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 6. ASSESSMENTS
-- One assessment per org per attempt. status: draft → complete.
-- ---------------------------------------------------------------------------
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

comment on table public.assessments is
  'One assessment attempt per organization. Holds draft and complete states.';

-- ---------------------------------------------------------------------------
-- 7. ASSESSMENT_RESPONSES
-- One row per question per assessment. Upserted on each page save.
-- ---------------------------------------------------------------------------
create table if not exists public.assessment_responses (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  dimension      text not null,
  question_index integer not null,
  question_text  text not null,
  score          integer not null check (score between 1 and 5),
  created_at     timestamptz not null default now(),

  -- Ensures upsert on (assessment_id, dimension, question_index) is idempotent
  unique (assessment_id, dimension, question_index)
);

comment on table public.assessment_responses is
  'Individual question scores. Upserted on every page navigation — safe to re-run.';

-- ---------------------------------------------------------------------------
-- 8. DIMENSION_SCORES
-- Computed once on submission. One row per dimension per assessment.
-- ---------------------------------------------------------------------------
create table if not exists public.dimension_scores (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments (id) on delete cascade,
  dimension      text not null,
  raw_score      numeric(5,4) not null,   -- average question score (1–5)
  weighted_score numeric(7,6) not null,   -- raw_score × weight
  weight         numeric(4,3) not null,   -- dimension weight (e.g. 0.20)
  created_at     timestamptz not null default now(),

  unique (assessment_id, dimension)
);

comment on table public.dimension_scores is
  'Computed dimension scores stored on assessment submission. Used for dashboard display.';

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — assessments
-- ---------------------------------------------------------------------------
alter table public.assessments          enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.dimension_scores     enable row level security;

-- assessments: org members can select their own org's assessments
create policy "assess: org members select"
  on public.assessments
  for select
  using (organization_id = public.current_user_org_id());

-- assessments: org members can create assessments for their org
create policy "assess: org members insert"
  on public.assessments
  for insert
  with check (organization_id = public.current_user_org_id());

-- assessments: org members can update (e.g. mark complete) their org's assessments
create policy "assess: org members update"
  on public.assessments
  for update
  using (organization_id = public.current_user_org_id());

-- assessment_responses: access scoped through parent assessment → organization
create policy "resp: org members all"
  on public.assessment_responses
  for all
  using (
    exists (
      select 1 from public.assessments a
      where  a.id              = assessment_id
        and  a.organization_id = public.current_user_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.assessments a
      where  a.id              = assessment_id
        and  a.organization_id = public.current_user_org_id()
    )
  );

-- dimension_scores: access scoped through parent assessment → organization
create policy "dimscore: org members all"
  on public.dimension_scores
  for all
  using (
    exists (
      select 1 from public.assessments a
      where  a.id              = assessment_id
        and  a.organization_id = public.current_user_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.assessments a
      where  a.id              = assessment_id
        and  a.organization_id = public.current_user_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index if not exists assessments_org_id_idx
  on public.assessments (organization_id);

create index if not exists assessments_org_status_idx
  on public.assessments (organization_id, status);

create index if not exists responses_assessment_id_idx
  on public.assessment_responses (assessment_id);

create index if not exists dimscores_assessment_id_idx
  on public.dimension_scores (assessment_id);
