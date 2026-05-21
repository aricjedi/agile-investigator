import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/database";
import { TrustQScoreChart } from "@/components/score/TrustQScoreChart";
import {
  ScoreHistoryTable,
  type HistoryRow,
  type DimRow,
} from "@/components/score/ScoreHistoryTable";

export const metadata: Metadata = { title: "TrustQ Score" };

// ---------------------------------------------------------------------------
// /dashboard/trustq-score — Full score history page.
//
// Sections:
//   1. Current score hero with trend indicator
//   2. Large line chart — all assessments over time
//   3. Assessment history table with expandable dimension breakdowns
//
// Data flow:
//   Server component fetches score_history + dimension_scores and passes typed
//   props to client components (chart, expandable table).
//
// TODO: add period selector (3 m / 6 m / 1 yr / all) once sufficient history exists.
// TODO: add percentile ranking widget once benchmarking feature ships.
// TODO: add "improvement priority" recommendations ranked by weighted gap.
// TODO: add export to PDF/CSV once reporting sprint begins.
// ---------------------------------------------------------------------------

export default async function TrustQScorePage() {
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

  // ---- Score history (ascending for chart, will reverse for table) --------
  const { data: historyRows } = await supabase
    .from("score_history")
    .select("id, assessment_id, trustq_score, scored_at, notes")
    .eq("organization_id", org?.id ?? "")
    .order("scored_at", { ascending: true })
    .returns<HistoryRow[]>();

  const history: HistoryRow[] = historyRows ?? [];

  // ---- Dimension scores for all assessments in the history ----------------
  const assessmentIds = history.map((h) => h.assessment_id);

  let dimScoresMap: Record<string, DimRow[]> = {};

  if (assessmentIds.length > 0) {
    const { data: dimRows } = await supabase
      .from("dimension_scores")
      .select("assessment_id, dimension, raw_score, weighted_score, weight")
      .in("assessment_id", assessmentIds)
      .returns<(DimRow & { assessment_id: string })[]>();

    for (const row of dimRows ?? []) {
      if (!dimScoresMap[row.assessment_id]) dimScoresMap[row.assessment_id] = [];
      dimScoresMap[row.assessment_id].push({
        dimension:      row.dimension,
        raw_score:      row.raw_score,
        weighted_score: row.weighted_score,
        weight:         row.weight,
      });
    }
  }

  // ---- Derived display data -----------------------------------------------
  const currentEntry  = history.at(-1) ?? null;
  const previousEntry = history.length >= 2 ? history.at(-2)! : null;
  const currentScore  = currentEntry?.trustq_score ?? null;
  const previousScore = previousEntry?.trustq_score ?? null;
  const scoreDelta    =
    currentScore !== null && previousScore !== null
      ? Math.round(currentScore - previousScore)
      : null;

  // Chart data (ascending)
  const chartData = history.map((h) => ({
    date:  h.scored_at,
    score: Math.round(h.trustq_score),
  }));

  // Table rows newest-first
  const tableRows = [...history].reverse();

  // ---- Colour helpers -------------------------------------------------------
  function scoreLabelColor(score: number | null): string {
    if (score === null) return "text-gray-300";
    if (score >= 71) return "text-green-600";
    if (score >= 41) return "text-amber-500";
    return "text-red-500";
  }

  function scoreLabel(score: number): string {
    if (score >= 71) return "Good";
    if (score >= 41) return "Fair";
    return "At Risk";
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">

      {/* ---- Page header ---- */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">TrustQ Score</h1>
        <p className="mt-1 text-sm text-gray-500">
          {org?.name ?? "Your organization"} — investigations program maturity over time
        </p>
      </div>

      {/* ---- Current score hero ---- */}
      <div className="rounded-xl bg-white border border-gray-200 px-6 py-5 flex flex-wrap items-center gap-6">

        {/* Score number */}
        <div className="flex-1 min-w-[140px]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Current TrustQ Score
          </p>
          {currentScore !== null ? (
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold tabular-nums ${scoreLabelColor(currentScore)}`}>
                {Math.round(currentScore)}
              </span>
              <span className="text-base text-gray-400">/ 100</span>
              <span
                className={`ml-1 text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                  currentScore >= 71
                    ? "text-green-700 bg-green-50 border-green-200"
                    : currentScore >= 41
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : "text-red-700 bg-red-50 border-red-200"
                }`}
              >
                {scoreLabel(currentScore)}
              </span>
            </div>
          ) : (
            <p className="text-3xl font-bold text-gray-300">—</p>
          )}
        </div>

        {/* Trend vs. previous */}
        {scoreDelta !== null && (
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              vs. previous
            </p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                scoreDelta > 0
                  ? "text-green-600"
                  : scoreDelta < 0
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
            >
              {scoreDelta > 0 ? "+" : ""}
              {scoreDelta}
            </p>
          </div>
        )}

        {/* Previous score */}
        {previousScore !== null && (
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Previous score
            </p>
            <p className="text-2xl font-bold text-gray-400 tabular-nums">
              {Math.round(previousScore)}
            </p>
          </div>
        )}

        {/* CTA when no score yet */}
        {currentScore === null && (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Complete your first Diagnostic Assessment to generate a TrustQ Score.
            </p>
            <Link
              href="/dashboard/assessment"
              className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Start assessment →
            </Link>
          </div>
        )}
      </div>

      {/* ---- Score history chart ---- */}
      {history.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Score history
          </h2>

          {history.length === 1 ? (
            <div className="rounded-xl bg-white border border-gray-200 px-6 py-8 text-center">
              <p className={`text-4xl font-bold mb-2 ${scoreLabelColor(currentScore)}`}>
                {Math.round(currentScore!)}
                <span className="text-xl font-normal text-gray-400 ml-1">/ 100</span>
              </p>
              <p className="text-sm text-gray-500">
                Complete another assessment to track progress over time.
              </p>
              <Link
                href="/dashboard/assessment"
                className="mt-4 inline-flex items-center text-sm font-medium text-brand-600 hover:underline"
              >
                Start next assessment →
              </Link>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 px-4 pt-5 pb-3">
              <TrustQScoreChart data={chartData} height={260} />
            </div>
          )}
        </section>
      )}

      {/* ---- Assessment history table ---- */}
      {history.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">
              Assessment history
            </h2>
            <span className="text-xs text-gray-400">
              {history.length} assessment{history.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ScoreHistoryTable rows={tableRows} dimScores={dimScoresMap} />
          {/* TODO: add pagination once assessment count exceeds 20 */}
        </section>
      )}

      {/* ---- Empty state ---- */}
      {history.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
          <p className="text-gray-400 mb-4">No assessments completed yet.</p>
          <Link
            href="/dashboard/assessment"
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Start your first assessment →
          </Link>
        </div>
      )}
    </div>
  );
}
