-- =============================================================================
-- Migration 002 — Org Profiles + v2 Scoring columns
--
-- What this adds:
--   1. org_profiles table — captures the Organization Profile that drives
--      per-dimension target computation.  One row per org; updated in place.
--
--   2. New columns on dimension_scores — v2 scoring stores the full
--      contribution breakdown alongside the legacy raw_score/weighted_score
--      columns (kept for backward compatibility with any existing rows).
--
-- Apply via:  Supabase Dashboard → SQL Editor → Run
-- Or:         supabase db push  (if using local CLI workflow)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. org_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Scale
  headcount            text NOT NULL CHECK (headcount IN ('small', 'mid', 'large')),
  -- 'small' = <1,000  |  'mid' = 1,000–10,000  |  'large' = 10,000+

  -- Geographic reach
  geographic_scope     text NOT NULL CHECK (geographic_scope IN ('single', 'multi')),
  -- 'single' = single jurisdiction  |  'multi' = multi-jurisdiction / cross-border

  -- Risk profile
  consequence_severity text NOT NULL CHECK (consequence_severity IN ('low', 'moderate', 'high')),
  regulated            boolean NOT NULL DEFAULT false,
  case_volume          text NOT NULL CHECK (case_volume IN ('low', 'moderate', 'high')),

  -- Optional — for future sourced risk-weighting
  industry             text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id)  -- one profile per org; update in place
);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER org_profiles_updated_at
  BEFORE UPDATE ON org_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS — org members can read their own profile; only admins (service role) write
ALTER TABLE org_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_profiles_select" ON org_profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Service-role writes bypass RLS; client-side reads use the SELECT policy above.

-- -----------------------------------------------------------------------------
-- 2. dimension_scores — add v2 scoring columns
--
-- current_score : the assessor's direct 1–5 dimension rating (v2)
-- target        : the risk-adjusted target from computeTargets() (1–5)
-- ratio         : min(current_score / target, 1.0) — capped at 1
-- contribution  : ratio × weight — this dimension's share of the 0–1 total
-- gap           : max(target - current_score, 0)
--
-- All nullable so existing v1 rows stay valid.
-- -----------------------------------------------------------------------------
ALTER TABLE dimension_scores
  ADD COLUMN IF NOT EXISTS current_score integer,
  ADD COLUMN IF NOT EXISTS target        integer,
  ADD COLUMN IF NOT EXISTS ratio         numeric(5,4),
  ADD COLUMN IF NOT EXISTS contribution  numeric(7,6),
  ADD COLUMN IF NOT EXISTS gap           integer;

-- Helpful comment on the table (Supabase Table Editor shows this)
COMMENT ON COLUMN dimension_scores.raw_score      IS 'v1 — average of per-question scores (1–5)';
COMMENT ON COLUMN dimension_scores.weighted_score IS 'v1 — raw_score × weight';
COMMENT ON COLUMN dimension_scores.current_score  IS 'v2 — assessor direct maturity rating (1–5)';
COMMENT ON COLUMN dimension_scores.target         IS 'v2 — risk-adjusted target from org profile (1–5)';
COMMENT ON COLUMN dimension_scores.ratio          IS 'v2 — min(current_score / target, 1.0)';
COMMENT ON COLUMN dimension_scores.contribution   IS 'v2 — ratio × weight, sums to TrustQ Score / 100';
COMMENT ON COLUMN dimension_scores.gap            IS 'v2 — max(target - current_score, 0)';

-- -----------------------------------------------------------------------------
-- 3. assessments — add org_profile_id foreign key (nullable; v1 rows have none)
-- -----------------------------------------------------------------------------
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS org_profile_id uuid REFERENCES org_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN assessments.org_profile_id IS 'v2 — links the org profile snapshot used to compute targets';
