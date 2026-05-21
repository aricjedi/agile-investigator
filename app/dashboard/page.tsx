import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/database";
import { TrustQScoreChart, type ScoreDataPoint } from "@/components/score/TrustQScoreChart";

export const metadata: Metadata = { title: "Dashboard" };

// ---------------------------------------------------------------------------
// /dashboard — Client portal home.
//
// Sections:
//   1. Welcome header + current TrustQ Score badge with delta vs. previous
//   2. Score history chart widget (or single-score message if only 1 assessment)
//   3. Strongest / weakest dimension panels (post-assessment)
//   4. Four feature cards
//
// TODO: add upcoming action items / deadlines widget.
// TODO: add org-scoped recent activity feed.
// ---------------------------------------------------------------------------
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("user_id", user?.id ?? "")
    .returns<(Profile & { organizations: Organization })[]>()
    .single();

  const profile = profileRow as (Profile & { organizations: Organization }) | null;
  const org     = profile?.organizations;

  // First name only for the welcome message
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;

  // ---- Score history (ascending for chart) --------------------------------
  let scoreHistory: { trustq_score: number; scored_at: string }[] = [];

  if (org?.id) {
    const { data: histRows } = await supabase
      .from("score_history")
      .select("trustq_score, scored_at")
      .eq("organization_id", org.id)
      .order("scored_at", { ascending: true })
      .returns<{ trustq_score: number; scored_at: string }[]>();

    scoreHistory = histRows ?? [];
  }

  const chartData: ScoreDataPoint[] = scoreHistory.map((h) => ({
    date:  h.scored_at,
    score: Math.round(h.trustq_score),
  }));

  const currentScore  = scoreHistory.at(-1)?.trustq_score ?? null;
  const previousScore = scoreHistory.length >= 2
    ? scoreHistory.at(-2)!.trustq_score
    : null;
  const scoreDelta =
    currentScore !== null && previousScore !== null
      ? Math.round(currentScore - previousScore)
      : null;

  // ---- Dimension scores for strongest/weakest display ---------------------
  let dimScores: { dimension: string; raw_score: number; weighted_score: number }[] = [];

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
      const { data: scores } = await supabase
        .from("dimension_scores")
        .select("dimension, raw_score, weighted_score")
        .eq("assessment_id", latestAssessment.id)
        .order("weighted_score", { ascending: false })
        .returns<{ dimension: string; raw_score: number; weighted_score: number }[]>();

      dimScores = scores ?? [];
    }
  }

  const strongest = dimScores.slice(0, 3);
  const weakest   = [...dimScores].reverse().slice(0, 3);

  // ---- Feature cards ------------------------------------------------------
  // TODO: flip live=true for Metrics Dashboard and Document Review as each ships.
  const features: FeatureCardProps[] = [
    {
      label:       "Diagnostic Assessment",
      href:        "/dashboard/assessment",
      description: "Complete a structured assessment of your investigations program maturity.",
      icon:        "clipboard",
      live:        true,
    },
    {
      label:       "TrustQ Score",
      href:        "/dashboard/trustq-score",
      description: "View your organization's TrustQ Score history and the dimensions that drive it.",
      icon:        "chart-bar",
      live:        true,
    },
    {
      label:       "Metrics Dashboard",
      href:        "/dashboard/metrics",
      description: "Track key performance indicators across your investigations lifecycle.",
      icon:        "chart-line",
      live:        false,
    },
    {
      label:       "Document Review",
      href:        "/dashboard/documents",
      description: "Upload and review program documentation, policies, and procedures.",
      icon:        "folder",
      live:        false,
    },
  ];

  return (
    <div className="flex flex-col gap-8">

      {/* ---- Welcome header ---- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {org?.name ?? "Your organization"} — investigations program overview
          </p>
        </div>

        {/* Current TrustQ Score badge */}
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            TrustQ Score
          </p>
          {currentScore !== null ? (
            <div>
              <p
                className={`text-3xl font-bold tabular-nums ${
                  currentScore >= 71
                    ? "text-green-600"
                    : currentScore >= 41
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {Math.round(currentScore)}
                <span className="text-base font-normal text-gray-400"> / 100</span>
              </p>
              {scoreDelta !== null && (
                <p
                  className={`text-xs font-semibold mt-0.5 ${
                    scoreDelta > 0
                      ? "text-green-600"
                      : scoreDelta < 0
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  {scoreDelta > 0 ? "▲ +" : scoreDelta < 0 ? "▼ " : ""}
                  {scoreDelta !== 0 ? scoreDelta : "No change"} vs. previous
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-0.5">
                <Link
                  href="/dashboard/assessment"
                  className="hover:text-brand-600 transition-colors underline underline-offset-2"
                >
                  Complete assessment to score
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---- Score history chart widget ---- */}
      {scoreHistory.length === 1 && (
        <div className="rounded-xl bg-white border border-gray-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Score history
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Complete another assessment to track progress over time.{" "}
            <Link
              href="/dashboard/assessment"
              className="text-brand-600 hover:underline font-medium"
            >
              Start next assessment →
            </Link>
          </p>
        </div>
      )}

      {scoreHistory.length >= 2 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700">Score history</h2>
            <Link
              href="/dashboard/trustq-score"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              View full history →
            </Link>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 px-4 pt-4 pb-2">
            <TrustQScoreChart data={chartData} height={180} compact />
          </div>
        </section>
      )}

      {/* ---- Strongest / weakest dimensions (post-assessment only) ---- */}
      {dimScores.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">
              Assessment results
            </h2>
            <Link
              href="/dashboard/trustq-score"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Full breakdown →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Strongest */}
            <div className="rounded-xl bg-white border border-gray-200 p-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">
                Strongest dimensions
              </p>
              <div className="flex flex-col gap-3">
                {strongest.map((d) => (
                  <DimScoreRow
                    key={d.dimension}
                    name={d.dimension}
                    rawScore={d.raw_score}
                    positive
                  />
                ))}
              </div>
            </div>

            {/* Weakest */}
            <div className="rounded-xl bg-white border border-gray-200 p-5">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">
                Areas for growth
              </p>
              <div className="flex flex-col gap-3">
                {weakest.map((d) => (
                  <DimScoreRow
                    key={d.dimension}
                    name={d.dimension}
                    rawScore={d.raw_score}
                    positive={false}
                  />
                ))}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ---- Four feature cards ---- */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-4">Program tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feat) => (
            <FeatureCard key={feat.href} {...feat} />
          ))}
        </div>
      </section>

    </div>
  );
}

// ---------------------------------------------------------------------------
// DimScoreRow — one row in the strongest/weakest panel
// ---------------------------------------------------------------------------
function DimScoreRow({
  name,
  rawScore,
  positive,
}: {
  name:     string;
  rawScore: number;
  positive: boolean;
}) {
  const pct = Math.round((rawScore / 5) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-700 truncate">{name}</span>
        <span className="text-xs font-semibold text-gray-600 ml-2 shrink-0 tabular-nums">
          {rawScore.toFixed(1)}<span className="text-gray-400 font-normal">/5</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${positive ? "bg-green-500" : "bg-amber-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature card
// ---------------------------------------------------------------------------
interface FeatureCardProps {
  label:       string;
  href:        string;
  description: string;
  icon:        "clipboard" | "chart-bar" | "chart-line" | "folder";
  live:        boolean;
}

function FeatureCard({ label, description, icon, href, live }: FeatureCardProps) {
  const inner = (
    <>
      {!live && (
        <span className="absolute top-4 right-4 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Coming soon
        </span>
      )}
      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
        <FeatureIcon name={icon} />
      </div>
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </>
  );

  const base =
    "relative rounded-xl bg-white border border-gray-200 p-6 flex flex-col gap-3 transition-all";

  if (live) {
    return (
      <Link href={href} className={`${base} hover:border-brand-300 hover:shadow-sm`}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={`${base} opacity-75 cursor-default`}>
      {inner}
    </div>
  );
}

function FeatureIcon({ name }: { name: FeatureCardProps["icon"] }) {
  switch (name) {
    case "clipboard":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case "chart-bar":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "chart-line":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    case "folder":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      );
  }
}
