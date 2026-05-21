-- =============================================================================
-- schema-score-history.sql
-- Longitudinal TrustQ Score tracking.
-- Run once in the Supabase SQL editor (idempotent — all statements are safe to
-- re-execute if the migration is accidentally run twice).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- score_history
-- One row per completed assessment per organization.
-- Unique constraint on assessment_id prevents duplicate inserts on re-submit.
-- ---------------------------------------------------------------------------
create table if not exists public.score_history (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  assessment_id   uuid        not null references public.assessments(id)   on delete cascade,
  trustq_score    numeric     not null,
  scored_at       timestamptz not null default now(),
  notes           text
);

-- Efficient lookups: org-scoped time-series queries
create index if not exists score_history_org_time_idx
  on public.score_history(organization_id, scored_at asc);

-- Prevent double-recording the same assessment
create unique index if not exists score_history_assessment_id_key
  on public.score_history(assessment_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.score_history enable row level security;

-- Clients and viewers can read their own organization's history.
-- Inserts/updates are performed via the service-role admin client in
-- submitAssessment — the service role bypasses RLS.
create policy "Users can read own org score history"
  on public.score_history
  for select
  using (organization_id = public.current_user_org_id());

-- TODO: add an admin-only select policy once admin RLS helpers are built.
-- TODO: add a security-definer insert function to replace the admin-client approach.
