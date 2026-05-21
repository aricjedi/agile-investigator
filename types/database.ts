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
  raw_score:      number;
  weighted_score: number;
  weight:         number;
  created_at:     string;
}

// ---------------------------------------------------------------------------
// Supabase Database type — full definition lives in types/supabase.ts.
// Re-exported here so existing imports of Database from this file keep working.
// ---------------------------------------------------------------------------
export type { Database } from "@/types/supabase";
