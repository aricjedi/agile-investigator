import { notFound, redirect } from "next/navigation";
import type { Metadata }      from "next";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { DiagnosticWizard }   from "@/components/assessment/DiagnosticWizard";
import {
  DIMENSION_RUBRICS,
  computeTargets,
  type DimensionTargets,
  type OrgProfile as RubricOrgProfile,
} from "@/lib/assessment/rubrics";

export const metadata: Metadata = { title: "Diagnostic Assessment" };

// ---------------------------------------------------------------------------
// /dashboard/assessment/[id] — v2 Diagnostic Assessment wizard page.
//
// Flow:
//   1. Load assessment + org_profile_id
//   2. If no org profile → redirect to org-profile step
//   3. Compute dimension targets from org profile
//   4. Load any existing dimension ratings (for draft resume)
//   5. Render DiagnosticWizard (nine-dimension rubric selection)
// ---------------------------------------------------------------------------
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Load assessment — RLS scopes to user's org
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status, organization_id, org_profile_id")
    .eq("id", id)
    .returns<{
      id:              string;
      status:          string;
      organization_id: string;
      org_profile_id:  string | null;
    }[]>()
    .single();

  if (!assessment) notFound();
  if (assessment.status === "complete") redirect("/dashboard");

  // If org profile not yet captured → redirect to the profile step first
  if (!assessment.org_profile_id) {
    redirect(`/dashboard/assessment/org-profile?assessment=${id}`);
  }

  // Load org profile to compute targets
  const { data: profileRow } = await admin
    .from("org_profiles")
    .select("headcount, geographic_scope, consequence_severity, regulated, case_volume, industry")
    .eq("id", assessment.org_profile_id)
    .returns<{
      headcount:            string;
      geographic_scope:     string;
      consequence_severity: string;
      regulated:            boolean;
      case_volume:          string;
      industry:             string | null;
    }[]>()
    .single();

  // Fall back to safe defaults if profile load fails (shouldn't happen)
  const orgProfile: RubricOrgProfile = profileRow
    ? {
        headcount:           profileRow.headcount           as RubricOrgProfile["headcount"],
        geographicScope:     profileRow.geographic_scope    as RubricOrgProfile["geographicScope"],
        consequenceSeverity: profileRow.consequence_severity as RubricOrgProfile["consequenceSeverity"],
        regulated:           profileRow.regulated,
        caseVolume:          profileRow.case_volume         as RubricOrgProfile["caseVolume"],
        industry:            profileRow.industry ?? undefined,
      }
    : {
        headcount:           "mid",
        geographicScope:     "single",
        consequenceSeverity: "moderate",
        regulated:           false,
        caseVolume:          "moderate",
      };

  const targets: DimensionTargets = computeTargets(orgProfile);

  // Load existing dimension ratings (draft resume)
  const { data: ratingRows } = await supabase
    .from("dimension_scores")
    .select("dimension, current_score")
    .eq("assessment_id", id)
    .returns<{ dimension: string; current_score: number | null }[]>();

  // Build dimensionId → score map
  const existingRatings: Record<string, number> = {};
  for (const row of ratingRows ?? []) {
    const dim = DIMENSION_RUBRICS.find(d => d.name === row.dimension);
    if (dim && row.current_score !== null) {
      existingRatings[dim.id] = row.current_score;
    }
  }

  return (
    <DiagnosticWizard
      assessmentId={id}
      targets={targets}
      existingRatings={existingRatings}
    />
  );
}
