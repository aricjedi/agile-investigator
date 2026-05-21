import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

// ---------------------------------------------------------------------------
// /dashboard — Client portal home.
//
// Shows: welcome header, TrustQ Score badge, strongest/weakest dimensions
// (once an assessment is complete), and four feature cards.
//
// TODO: replace TrustQ Score badge with trend chart once score history ships.
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
    .single();

  const profile = profileRow as (Profile & { organizations: Organization }) | null;
  const org     = profile?.organizations;

  // First name only for the welcome message
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;

  // ---- Dimension scores for strongest/weakest display ----
  // Only populated after at least one complete assessment.
  let dimScores: { dimension: string; raw_score: number; weighted_score: number }[] = [];

  if (org?.id) {
    // Get the most recently completed assessment for this org
    const { data: latestAssessment } = await supabase
      .from("assessments")
      .select("id")
      .eq("organization_id", org.id)
      .eq("status", "complete")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAssessment) {
      // Fetch all dimension scores, sorted best → worst by weighted score
      const { data: scores } = await supabase
        .from("dimension_scores")
        .select("dimension, raw_score, weighted_score")
        .eq("assessment_id", latestAssessment.id)
        .order("weighted_score", { ascending: false });

      dimScores = scores ?? [];
    }
  }

  const strongest = dimScores.slice(0, 3);
  const weakest   = [...dimScores].reverse().slice(0, 3);

  // ---- Feature cards ----
  // TODO: flip live=true as each feature ships and remove the coming-soon state.
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
      href:        "/dashboard/health-score",
      description: "View your organization's TrustQ Score and the dimensions that drive it.",
      icon:        "chart-bar",
      live:        false,
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

        {/* TrustQ Score badge */}
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            TrustQ Score
          </p>
          {org?.health_score !== null && org?.health_score !== undefined ? (
            <div>
              <p
                className={`text-3xl font-bold ${
                  org.health_score >= 71
                    ? "text-green-600"
                    : org.health_score >= 41
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {org.health_score}
                <span className="text-base font-normal text-gray-400"> / 100</span>
              </p>
              {/* TODO: show delta vs. previous period once score history table ships */}
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

      {/* ---- Strongest / weakest dimensions (post-assessment only) ---- */}
      {dimScores.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            Assessment results
          </h2>
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
          {/* TODO: add "View full breakdown" link once /dashboard/health-score is built */}
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
