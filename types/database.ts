// ---------------------------------------------------------------------------
// Database types — keep in sync with supabase/schema.sql
// Run `npx supabase gen types typescript` to regenerate from a live project.
// ---------------------------------------------------------------------------

export type OrganizationStatus = "active" | "inactive";
export type UserRole = "admin" | "client" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  health_score: number | null;
  status: OrganizationStatus;
}

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Assessment types — keep in sync with supabase/schema-assessment.sql
// ---------------------------------------------------------------------------

export type AssessmentStatus = "draft" | "complete";

export interface Assessment {
  id:              string;
  organization_id: string;
  created_by:      string;
  status:          AssessmentStatus;
  created_at:      string;
  completed_at:    string | null;
}

export interface AssessmentResponse {
  id:             string;
  assessment_id:  string;
  dimension:      string;
  question_index: number;
  question_text:  string;
  score:          number;
  created_at:     string;
}

export interface ScoreHistory {
  id:              string;
  organization_id: string;
  assessment_id:   string;
  trustq_score:    number;
  scored_at:       string;
  notes:           string | null;
}

export interface DimensionScore {
  id:             string;
  assessment_id:  string;
  dimension:      string;
  // v1 fields (legacy — kept for backward compat)
  raw_score:      number;
  weighted_score: number;
  weight:         number;
  // v2 fields (nullable on legacy rows)
  current_score:  number | null;
  target:         number | null;
  ratio:          number | null;
  contribution:   number | null;
  gap:            number | null;
  created_at:     string;
}

// ---- Org Profile (v2) -------------------------------------------------------
export type Headcount           = "small" | "mid" | "large";
export type GeographicScope     = "single" | "multi";
export type ConsequenceSeverity = "low" | "moderate" | "high";
export type CaseVolume          = "low" | "moderate" | "high";

export interface OrgProfile {
  id:                   string;
  organization_id:      string;
  headcount:            Headcount;
  geographic_scope:     GeographicScope;
  consequence_severity: ConsequenceSeverity;
  regulated:            boolean;
  case_volume:          CaseVolume;
  industry:             string | null;
  created_at:           string;
  updated_at:           string;
}

// ---------------------------------------------------------------------------
// Supabase Database type — full definition lives in types/supabase.ts.
// Re-exported here so existing imports of Database from this file keep working.
// ---------------------------------------------------------------------------
export type { Database } from "@/types/supabase";
