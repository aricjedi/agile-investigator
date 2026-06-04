"use server";

// ---------------------------------------------------------------------------
// Assessment server actions — called from client components.
//
// v1 actions (legacy — still used by old assessments in DB):
//   saveResponses     — upserts per-question responses
//   submitAssessment  — v1 scoring (average of questions × weight)
//
// v2 actions (new engine):
//   saveOrgProfile    — upserts the org profile that drives targets
//   saveDimensionRating — upserts a single dimension's 1–5 rating
//   submitAssessmentV2  — v2 scoring (min(current/target,1) × weight)
// ---------------------------------------------------------------------------

import { revalidatePath }    from "next/cache";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIMENSIONS }        from "@/lib/assessment/questions";      // v1
import { calculateScores }   from "@/lib/assessment/scoring";        // v1
import {
  DIMENSION_RUBRICS,
  computeTargets,
  computeScore,
  type MaturityScore,
  type OrgProfile as RubricOrgProfile,
} from "@/lib/assessment/rubrics";                                   // v2
import type {
  Headcount, GeographicScope, ConsequenceSeverity, CaseVolume,
} from "@/types/database";

// ============================================================================
// v1 actions (kept for backward compat)
// ============================================================================

export async function saveResponses(
  assessmentId:  string,
  dimensionName: string,
  responses:     Record<number, number>
): Promise<void> {
  if (Object.keys(responses).length === 0) return;

  const dim = DIMENSIONS.find((d) => d.name === dimensionName);
  if (!dim) throw new Error(`Unknown dimension: ${dimensionName}`);

  const supabase = await createClient();
  const rows = Object.entries(responses).map(([idx, score]) => {
    const i = parseInt(idx, 10);
    return {
      assessment_id:  assessmentId,
      dimension:      dimensionName,
      question_index: i,
      question_text:  dim.questions[i]?.text ?? "",
      score,
    };
  });

  const { error } = await supabase
    .from("assessment_responses")
    .upsert(rows as unknown as never[], { onConflict: "assessment_id,dimension,question_index" });

  if (error) throw new Error(`saveResponses failed: ${error.message}`);
}

export async function submitAssessment(assessmentId: string): Promise<number> {
  const supabase = await createClient();

  const { data: responseRows, error: respError } = await supabase
    .from("assessment_responses")
    .select("dimension, question_index, score")
    .eq("assessment_id", assessmentId)
    .returns<{ dimension: string; question_index: number; score: number }[]>();

  if (respError) throw new Error(`Could not load responses: ${respError.message}`);

  const responseMap: Record<string, Record<number, number>> = {};
  for (const r of responseRows ?? []) {
    if (!responseMap[r.dimension]) responseMap[r.dimension] = {};
    responseMap[r.dimension][r.question_index] = r.score;
  }

  const { dimensionScores, totalScore } = calculateScores(DIMENSIONS, responseMap);

  const dimRows = dimensionScores.map((ds) => ({
    assessment_id:  assessmentId,
    dimension:      ds.dimension,
    raw_score:      ds.raw_score,
    weighted_score: ds.weighted_score,
    weight:         ds.weight,
  }));

  const { error: dimError } = await supabase
    .from("dimension_scores")
    .upsert(dimRows as unknown as never[], { onConflict: "assessment_id,dimension" });

  if (dimError) throw new Error(`Could not save dimension scores: ${dimError.message}`);

  const { data: assessment, error: updateError } = await supabase
    .from("assessments")
    .update({ status: "complete", completed_at: new Date().toISOString() } as unknown as never)
    .eq("id", assessmentId)
    .select("organization_id")
    .returns<{ organization_id: string }[]>()
    .single();

  if (updateError || !assessment) {
    throw new Error(`Could not complete assessment: ${updateError?.message}`);
  }

  const admin = createAdminClient();
  await admin.from("organizations").update({ health_score: totalScore }).eq("id", assessment.organization_id);
  await admin.from("score_history").upsert(
    {
      organization_id: assessment.organization_id,
      assessment_id:   assessmentId,
      trustq_score:    totalScore,
      scored_at:       new Date().toISOString(),
    } as unknown as never,
    { onConflict: "assessment_id" }
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trustq-score");
  return totalScore;
}

// ============================================================================
// v2 actions
// ============================================================================

// ---------------------------------------------------------------------------
// saveOrgProfile — upserts the org profile and links it to the assessment
// ---------------------------------------------------------------------------
export async function saveOrgProfile(input: {
  organizationId:      string;
  assessmentId:        string;
  headcount:           Headcount;
  geographicScope:     GeographicScope;
  consequenceSeverity: ConsequenceSeverity;
  regulated:           boolean;
  caseVolume:          CaseVolume;
  industry:            string | null;
}): Promise<void> {
  const admin = createAdminClient();

  // Upsert the org profile (unique on organization_id)
  const { data: profile, error: profileError } = await admin
    .from("org_profiles")
    .upsert(
      {
        organization_id:      input.organizationId,
        headcount:            input.headcount,
        geographic_scope:     input.geographicScope,
        consequence_severity: input.consequenceSeverity,
        regulated:            input.regulated,
        case_volume:          input.caseVolume,
        industry:             input.industry,
      } as unknown as never,
      { onConflict: "organization_id" }
    )
    .select("id")
    .returns<{ id: string }[]>()
    .single();

  if (profileError || !profile) {
    throw new Error(`saveOrgProfile failed: ${profileError?.message}`);
  }

  // Link profile to the assessment
  const { error: linkError } = await admin
    .from("assessments")
    .update({ org_profile_id: profile.id } as unknown as never)
    .eq("id", input.assessmentId);

  if (linkError) throw new Error(`Could not link profile to assessment: ${linkError.message}`);
}

// ---------------------------------------------------------------------------
// saveDimensionRating — upserts a single dimension's 1–5 current-state rating
// ---------------------------------------------------------------------------
export async function saveDimensionRating(
  assessmentId: string,
  dimensionId:  string,
  score:        MaturityScore
): Promise<void> {
  const dim = DIMENSION_RUBRICS.find(d => d.id === dimensionId);
  if (!dim) throw new Error(`Unknown dimension: ${dimensionId}`);

  const supabase = await createClient();

  const { error } = await supabase
    .from("dimension_scores")
    .upsert(
      {
        assessment_id: assessmentId,
        dimension:     dim.name,   // store human name for display
        weight:        dim.weight,
        // v1 fields — set to 0 for v2-only rows to satisfy any NOT NULL
        raw_score:      0,
        weighted_score: 0,
        // v2 field — the direct rating
        current_score:  score,
      } as unknown as never,
      { onConflict: "assessment_id,dimension" }
    );

  if (error) throw new Error(`saveDimensionRating failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// submitAssessmentV2 — computes targets from org profile, runs v2 scoring,
// writes full dimension results, updates org health_score, records history.
// ---------------------------------------------------------------------------
export async function submitAssessmentV2(assessmentId: string): Promise<number> {
  const supabase = await createClient();
  const admin    = createAdminClient();

  // ---- Load the assessment + org profile ----------------------------------
  const { data: assessment, error: assessError } = await supabase
    .from("assessments")
    .select("organization_id, org_profile_id")
    .eq("id", assessmentId)
    .returns<{ organization_id: string; org_profile_id: string | null }[]>()
    .single();

  if (assessError || !assessment) {
    throw new Error(`Cannot load assessment: ${assessError?.message}`);
  }

  if (!assessment.org_profile_id) {
    throw new Error("Assessment has no org profile. Complete the Organization Profile step first.");
  }

  const { data: profileRow, error: profileError } = await admin
    .from("org_profiles")
    .select("*")
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

  if (profileError || !profileRow) {
    throw new Error(`Cannot load org profile: ${profileError?.message}`);
  }

  // Cast to the rubric engine's OrgProfile type
  const orgProfile: RubricOrgProfile = {
    headcount:           profileRow.headcount           as RubricOrgProfile["headcount"],
    geographicScope:     profileRow.geographic_scope    as RubricOrgProfile["geographicScope"],
    consequenceSeverity: profileRow.consequence_severity as RubricOrgProfile["consequenceSeverity"],
    regulated:           profileRow.regulated,
    caseVolume:          profileRow.case_volume         as RubricOrgProfile["caseVolume"],
    industry:            profileRow.industry ?? undefined,
  };

  // ---- Load current dimension ratings from DB -----------------------------
  const { data: ratingRows } = await supabase
    .from("dimension_scores")
    .select("dimension, current_score")
    .eq("assessment_id", assessmentId)
    .returns<{ dimension: string; current_score: number | null }[]>();

  // Build dimensionId → current score map (fall back to dimension name lookup)
  const currentScores: Record<string, number> = {};
  for (const row of ratingRows ?? []) {
    const dim = DIMENSION_RUBRICS.find(d => d.name === row.dimension);
    if (dim && row.current_score !== null) {
      currentScores[dim.id] = row.current_score;
    }
  }

  // ---- Compute targets and score ------------------------------------------
  const targets = computeTargets(orgProfile);
  const { trustqScore, dimensionResults } = computeScore(currentScores, targets);

  // ---- Upsert full dimension results --------------------------------------
  const dimRows = dimensionResults.map((dr) => ({
    assessment_id:  assessmentId,
    dimension:      dr.name,
    weight:         dr.weight,
    raw_score:      dr.current,      // keep raw_score in sync for v1 display compat
    weighted_score: dr.contribution, // keep weighted_score in sync
    current_score:  dr.current,
    target:         dr.target,
    ratio:          Math.round(dr.ratio * 10000) / 10000,
    contribution:   Math.round(dr.contribution * 1000000) / 1000000,
    gap:            dr.gap,
  }));

  const { error: dimError } = await supabase
    .from("dimension_scores")
    .upsert(dimRows as unknown as never[], { onConflict: "assessment_id,dimension" });

  if (dimError) throw new Error(`Could not save dimension scores: ${dimError.message}`);

  // ---- Mark assessment complete -------------------------------------------
  const { error: updateError } = await supabase
    .from("assessments")
    .update({ status: "complete", completed_at: new Date().toISOString() } as unknown as never)
    .eq("id", assessmentId);

  if (updateError) throw new Error(`Could not complete assessment: ${updateError.message}`);

  // ---- Update org health_score + record history ---------------------------
  await admin
    .from("organizations")
    .update({ health_score: trustqScore })
    .eq("id", assessment.organization_id);

  await admin.from("score_history").upsert(
    {
      organization_id: assessment.organization_id,
      assessment_id:   assessmentId,
      trustq_score:    trustqScore,
      scored_at:       new Date().toISOString(),
    } as unknown as never,
    { onConflict: "assessment_id" }
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/trustq-score");

  return trustqScore;
}
