import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AssessmentWizard } from "@/components/assessment/AssessmentWizard";

export const metadata: Metadata = { title: "Diagnostic Assessment" };

// ---------------------------------------------------------------------------
// /dashboard/assessment/[id] — Assessment wizard page.
//
// Fetches the assessment record and all saved responses for this session,
// then hands control to the AssessmentWizard client component.
//
// RLS ensures a user can only load assessments that belong to their org.
// If the assessment is already complete, redirect to the dashboard so the
// user sees their updated TrustQ Score.
//
// TODO: when longitudinal tracking ships, show a "view previous results" link
//       instead of a hard redirect for complete assessments.
// ---------------------------------------------------------------------------
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch the assessment — RLS scopes this to the user's org automatically
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, status, organization_id")
    .eq("id", id)
    .single();

  if (!assessment) notFound();

  // Redirect completed assessments to the dashboard
  if (assessment.status === "complete") {
    redirect("/dashboard");
  }

  // Load all previously saved responses for this assessment
  const { data: responseRows } = await supabase
    .from("assessment_responses")
    .select("dimension, question_index, score")
    .eq("assessment_id", id);

  // Convert flat rows → nested map: { dimensionName → { questionIndex → score } }
  const existingResponses: Record<string, Record<number, number>> = {};
  for (const r of responseRows ?? []) {
    if (!existingResponses[r.dimension]) existingResponses[r.dimension] = {};
    existingResponses[r.dimension][r.question_index] = r.score;
  }

  return (
    <AssessmentWizard
      assessmentId={id}
      existingResponses={existingResponses}
    />
  );
}
