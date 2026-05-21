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
// Supabase generated DB shape (subset) — expand as tables are added
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Organization>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Profile>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      organization_status: OrganizationStatus;
      user_role: UserRole;
    };
  };
}
