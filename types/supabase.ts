// ---------------------------------------------------------------------------
// types/supabase.ts — Manual Supabase Database type definition.
//
// This file replaces the auto-generated output of `supabase gen types typescript`.
// It must be kept in sync with supabase/schema.sql and supabase/schema-assessment.sql.
//
// Format matches the Supabase TypeScript client's expected GenericSchema shape,
// including the Relationships array required for column-selection type inference
// and nested-resource (join) type inference.
//
// To regenerate from a live project:
//   npx supabase gen types typescript --project-id <ref> > types/supabase.ts
// ---------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {

      // -----------------------------------------------------------------------
      // organizations
      // -----------------------------------------------------------------------
      organizations: {
        Row: {
          id:           string
          name:         string
          slug:         string
          created_at:   string
          health_score: number | null
          status:       "active" | "inactive"
        }
        Insert: {
          id?:           string
          name:          string
          slug:          string
          created_at?:   string
          health_score?: number | null
          status?:       "active" | "inactive"
        }
        Update: {
          id?:           string
          name?:         string
          slug?:         string
          created_at?:   string
          health_score?: number | null
          status?:       "active" | "inactive"
        }
        Relationships: []
      }

      // -----------------------------------------------------------------------
      // profiles
      // -----------------------------------------------------------------------
      profiles: {
        Row: {
          id:              string
          user_id:         string
          organization_id: string | null
          role:            "admin" | "client" | "viewer"
          full_name:       string
          created_at:      string
        }
        Insert: {
          id?:              string
          user_id:          string
          organization_id:  string
          role?:            "admin" | "client" | "viewer"
          full_name?:       string
          created_at?:      string
        }
        Update: {
          id?:              string
          user_id?:         string
          organization_id?: string | null
          role?:            "admin" | "client" | "viewer"
          full_name?:       string
          created_at?:      string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }

      // -----------------------------------------------------------------------
      // assessments
      // -----------------------------------------------------------------------
      assessments: {
        Row: {
          id:              string
          organization_id: string
          created_by:      string
          status:          "draft" | "complete"
          created_at:      string
          completed_at:    string | null
          org_profile_id:  string | null
        }
        Insert: {
          id?:              string
          organization_id:  string
          created_by:       string
          status?:          "draft" | "complete"
          created_at?:      string
          completed_at?:    string | null
          org_profile_id?:  string | null
        }
        Update: {
          id?:              string
          organization_id?: string
          created_by?:      string
          status?:          "draft" | "complete"
          created_at?:      string
          completed_at?:    string | null
          org_profile_id?:  string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }

      // -----------------------------------------------------------------------
      // assessment_responses
      // -----------------------------------------------------------------------
      assessment_responses: {
        Row: {
          id:             string
          assessment_id:  string
          dimension:      string
          question_index: number
          question_text:  string
          score:          number
          created_at:     string
        }
        Insert: {
          id?:            string
          assessment_id:  string
          dimension:      string
          question_index: number
          question_text:  string
          score:          number
          created_at?:    string
        }
        Update: {
          id?:             string
          assessment_id?:  string
          dimension?:      string
          question_index?: number
          question_text?:  string
          score?:          number
          created_at?:     string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          }
        ]
      }

      // -----------------------------------------------------------------------
      // score_history
      // -----------------------------------------------------------------------
      score_history: {
        Row: {
          id:              string
          organization_id: string
          assessment_id:   string
          trustq_score:    number
          scored_at:       string
          notes:           string | null
        }
        Insert: {
          id?:              string
          organization_id:  string
          assessment_id:    string
          trustq_score:     number
          scored_at?:       string
          notes?:           string | null
        }
        Update: {
          id?:              string
          organization_id?: string
          assessment_id?:   string
          trustq_score?:    number
          scored_at?:       string
          notes?:           string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          }
        ]
      }

      // -----------------------------------------------------------------------
      // org_profiles
      // -----------------------------------------------------------------------
      org_profiles: {
        Row: {
          id:                   string
          organization_id:      string
          headcount:            "small" | "mid" | "large"
          geographic_scope:     "single" | "multi"
          consequence_severity: "low" | "moderate" | "high"
          regulated:            boolean
          case_volume:          "low" | "moderate" | "high"
          industry:             string | null
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                   string
          organization_id:       string
          headcount:             "small" | "mid" | "large"
          geographic_scope:      "single" | "multi"
          consequence_severity:  "low" | "moderate" | "high"
          regulated?:            boolean
          case_volume:           "low" | "moderate" | "high"
          industry?:             string | null
          created_at?:           string
          updated_at?:           string
        }
        Update: {
          id?:                   string
          organization_id?:      string
          headcount?:            "small" | "mid" | "large"
          geographic_scope?:     "single" | "multi"
          consequence_severity?: "low" | "moderate" | "high"
          regulated?:            boolean
          case_volume?:          "low" | "moderate" | "high"
          industry?:             string | null
          created_at?:           string
          updated_at?:           string
        }
        Relationships: [
          {
            foreignKeyName: "org_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }

      // -----------------------------------------------------------------------
      // dimension_scores
      // -----------------------------------------------------------------------
      dimension_scores: {
        Row: {
          id:             string
          assessment_id:  string
          dimension:      string
          raw_score:      number
          weighted_score: number
          weight:         number
          current_score:  number | null
          target:         number | null
          ratio:          number | null
          contribution:   number | null
          gap:            number | null
          created_at:     string
        }
        Insert: {
          id?:            string
          assessment_id:  string
          dimension:      string
          raw_score:      number
          weighted_score: number
          weight:         number
          current_score?: number | null
          target?:        number | null
          ratio?:         number | null
          contribution?:  number | null
          gap?:           number | null
          created_at?:    string
        }
        Update: {
          id?:             string
          assessment_id?:  string
          dimension?:      string
          raw_score?:      number
          weighted_score?: number
          weight?:         number
          current_score?:  number | null
          target?:         number | null
          ratio?:          number | null
          contribution?:   number | null
          gap?:            number | null
          created_at?:     string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          }
        ]
      }

    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      // Returns the organization_id of the current authenticated user.
      // Used in RLS policies — also callable via .rpc() if needed.
      current_user_org_id: {
        Args:    Record<PropertyKey, never>
        Returns: string
      }
      // Looks up an auth.users id by email address.
      // Called by createOrganization action to check for existing users.
      get_auth_user_id_by_email: {
        Args:    { email_address: string }
        Returns: string
      }
    }

    Enums: {
      [_ in never]: never
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}
