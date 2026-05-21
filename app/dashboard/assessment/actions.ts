"use server";

// ---------------------------------------------------------------------------
// Assessment server actions — called from AssessmentWizard (client component).
//
// saveResponses  : upserts one dimension's answers on every page navigation.
// submitAssessment: calculates scores, stores results, updates org health_score.
//
// Both use createClient() (user session + RLS) for assessment tables.
// submitAssessment uses createAdminClient() specifically to update
// organizations.health_score, which the existing RLS restricts to admins.
// ---------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { createClient }   from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIMENSIONS }     from "@/lib/assessment/questions";
import { calculateScores } from "@/lib/assessment/scoring";

// ---------------------------------------------------------------------------
// saveResponses
// Upserts responses for a single dimension. Called on every Next/Back click.
// Idempotent — safe to call multiple times for the same dimension.
// ---------------------------------------------------------------------------
export async function saveResponses(
  assessmentId:  string,
  dimensionName: string,
  responses:     Record<number, number> // questionIndex → score (1–5)
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
    .upsert(rows, { onConflict: "assessment_id,dimension,question_index" });

  if (error) throw new Error(`saveResponses failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// submitAssessment
// Reads all responses, computes scores, writes dimension_scores, marks the
// assessment complete, and updates the organization's TrustQ Score.
// Returns the final 0–100 TrustQ Score for client-side display.
// ---------------------------------------------------------------------------
export async function submitAssessment(assessmentId: string): Promise<number> {
  const supabase = await createClient();

  // Load all responses for this assessment
  const { data: responseRows, error: respError } = await supabase
    .from("assessment_responses")
    .select("dimension, question_index, score")
    .eq("assessment_id", assessmentId);

  if (respError) throw new Error(`Could not load responses: ${respError.message}`);

  // Build response map: { dimensionName → { questionIndex → score } }
  const responseMap: Record<string, Record<number, number>> = {};
  for (const r of responseRows ?? []) {
    if (!responseMap[r.dimension]) responseMap[r.dimension] = {};
    responseMap[r.dimension][r.question_index] = r.score;
  }

  // Calculate scores (unanswered → 1 / Absent)
  const { dimensionScores, totalScore } = calculateScores(DIMENSIONS, responseMap);

  // Upsert dimension_scores (idempotent if re-submitted)
  const dimRows = dimensionScores.map((ds) => ({
    assessment_id:  assessmentId,
    dimension:      ds.dimension,
    raw_score:      ds.raw_score,
    weighted_score: ds.weighted_score,
    weight:         ds.weight,
  }));

  const { error: dimError } = await supabase
    .from("dimension_scores")
    .upsert(dimRows, { onConflict: "assessment_id,dimension" });

  if (dimError) throw new Error(`Could not save dimension scores: ${dimError.message}`);

  // Mark assessment complete
  const { data: assessment, error: updateError } = await supabase
    .from("assessments")
    .update({ status: "complete", completed_at: new Date().toISOString() })
    .eq("id", assessmentId)
    .select("organization_id")
    .single();

  if (updateError || !assessment) {
    throw new Error(`Could not complete assessment: ${updateError?.message}`);
  }

  // Update org health_score via admin client — organizations RLS restricts
  // updates to admin-role users, but clients submit their own scores.
  // TODO: replace with a security-definer SQL function once one is built.
  const admin = createAdminClient();
  await admin
    .from("organizations")
    .update({ health_score: totalScore })
    .eq("id", assessment.organization_id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/health-score");

  return totalScore;
}
