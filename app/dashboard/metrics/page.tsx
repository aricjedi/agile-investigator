import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/database";
import {
  ScenarioModeler,
  type BaselineDimension,
} from "@/components/score/ScenarioModeler";

export const metadata: Metadata = { title: "Scenario Modeler" };

// ---------------------------------------------------------------------------
// /dashboard/metrics — TrustQ Score Scenario Modeler.
//
// Server component: fetches the most recent completed assessment's dimension
// scores as the baseline, then passes them to the ScenarioModeler client
// component for interactive sandbox projection.
//
// No data is written here or in ScenarioModeler — read-only.
// ---------------------------------------------------------------------------
export default async function MetricsDashboardPage() {
  const supabase = await createClient();

  // ---- Current user + org ------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("user_id", user?.id ?? "")
    .returns<(Profile & { organizations: Organization })[]>()
    .single();

  const org = (profileRow as (Profile & { organizations: Organization }) | null)
    ?.organizations ?? null;

  // ---- Latest completed assessment ----------------------------------------
  let baselineDims: BaselineDimension[] = [];
  let baselineTotal: number | null      = null;

  if (org?.id) {
    const { data: latestAssessment } = await supabase
      .from("assessments")
      .select("id")
      .eq("organization_id", org.id)
      .eq("status", "complete")
      .order("completed_at", { ascending: false })
      .limit(1)
      .returns<{ id: string }[]>()
      .maybeSingle();

    if (latestAssessment) {
      // Dimension scores for this assessment
      const { data: dimRows } = await supabase
        .from("dimension_scores")
        .select("dimension, raw_score")
        .eq("assessment_id", latestAssessment.id)
        .returns<BaselineDimension[]>();

      baselineDims = dimRows ?? [];

      // Latest TrustQ Score from score_history
      const { data: scoreRow } = await supabase
        .from("score_history")
        .select("trustq_score")
        .eq("organization_id", org.id)
        .order("scored_at", { ascending: false })
        .limit(1)
        .returns<{ trustq_score: number }[]>()
        .maybeSingle();

      baselineTotal = scoreRow?.trustq_score ?? null;
    }
  }

  return (
    <ScenarioModeler
      baseline={baselineDims}
      baselineTotal={baselineTotal}
    />
  );
}
