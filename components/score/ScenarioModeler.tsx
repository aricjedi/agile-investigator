"use client";

// ---------------------------------------------------------------------------
// ScenarioModeler — Interactive TrustQ Score scenario planner.
//
// Lets users project what their TrustQ Score would be if specific program
// dimensions were improved. All calculation is client-side and sandbox-only;
// nothing is written to the database.
//
// Each slider maps directly to the dimension's raw_score (1–5 maturity scale),
// matching the exact formula used by the real scoring engine:
//   weighted_score = raw_score × weight
//   total = (Σ weighted_scores / 5) × 100
//
// Props:
//   baseline — dimension scores from the most recent real assessment.
//              If no assessment exists, every dimension defaults to 1.0.
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react";

// Dimension definitions — mirrors lib/assessment/questions.ts weights exactly.
// Labels include a "resource driver" note for use in budget conversations.
const DIMENSIONS = [
  {
    name:           "Governance & Structure",
    weight:         0.20,
    resourceDriver: "Program charter, reporting lines & executive sponsorship",
  },
  {
    name:           "Investigation Process",
    weight:         0.18,
    resourceDriver: "Documented methodology, case standards & fairness protocols",
  },
  {
    name:           "Intake & Triage",
    weight:         0.12,
    resourceDriver: "Reporting channels, hotline & triage protocols",
  },
  {
    name:           "People & Competency",
    weight:         0.12,
    resourceDriver: "Investigator headcount, credentials & professional development",
  },
  {
    name:           "Policy & Compliance",
    weight:         0.10,
    resourceDriver: "Written investigations policy & legal/regulatory alignment",
  },
  {
    name:           "Communication",
    weight:         0.10,
    resourceDriver: "Employee awareness campaigns & speak-up culture messaging",
  },
  {
    name:           "Training",
    weight:         0.10,
    resourceDriver: "Investigator training, manager awareness & employee education",
  },
  {
    name:           "Reporting & Metrics",
    weight:         0.05,
    resourceDriver: "KPI tracking, leadership reporting & trend analysis",
  },
  {
    name:           "Technology & Tools",
    weight:         0.03,
    resourceDriver: "Case management system & secure data infrastructure",
  },
] as const;

const MATURITY_LABELS: Record<number, string> = {
  1: "Absent",
  2: "Reactive",
  3: "Defined",
  4: "Managed",
  5: "Embedded",
};

function maturityLabel(score: number): string {
  const rounded = Math.round(score);
  return MATURITY_LABELS[rounded] ?? "—";
}

function scoreColor(score: number): string {
  if (score >= 71) return "text-green-600";
  if (score >= 41) return "text-amber-500";
  return "text-red-500";
}

function scoreLabel(score: number): string {
  if (score >= 71) return "Good";
  if (score >= 41) return "Fair";
  return "At Risk";
}

function scoreBadgeClass(score: number): string {
  if (score >= 71) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 41) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function calcTotal(rawScores: Record<string, number>): number {
  const weighted = DIMENSIONS.reduce((sum, d) => {
    const raw = rawScores[d.name] ?? 1;
    return sum + raw * d.weight;
  }, 0);
  return Math.round((weighted / 5) * 100);
}

export interface BaselineDimension {
  dimension:  string;
  raw_score:  number;
}

interface Props {
  baseline: BaselineDimension[];
  /** 0–100 TrustQ Score from the most recent real assessment. null if none. */
  baselineTotal: number | null;
}

export function ScenarioModeler({ baseline, baselineTotal }: Props) {
  // Build a lookup from baseline data; default to 1.0 (Absent) for any missing dim.
  const baselineMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of DIMENSIONS) m[d.name] = 1.0;
    for (const b of baseline)    m[b.dimension] = b.raw_score;
    return m;
  }, [baseline]);

  // Projected scores — initialized to baseline, adjusted by sliders.
  const [projected, setProjected] = useState<Record<string, number>>(
    () => ({ ...baselineMap })
  );

  const projectedTotal  = useMemo(() => calcTotal(projected), [projected]);
  const baselineTotalFn = useMemo(() => calcTotal(baselineMap), [baselineMap]);

  // Use the real stored score if available; otherwise recalculate from responses.
  const displayBaseline = baselineTotal ?? baselineTotalFn;
  const delta           = projectedTotal - displayBaseline;
  const hasChanges      = delta !== 0;

  function handleSlider(dimName: string, value: number) {
    setProjected((prev) => ({ ...prev, [dimName]: value }));
  }

  function resetAll() {
    setProjected({ ...baselineMap });
  }

  // Sort dimensions by score impact opportunity (weight × gap to 5).
  const sortedByImpact = [...DIMENSIONS].sort(
    (a, b) =>
      b.weight * (5 - (projected[b.name] ?? 1)) -
      a.weight * (5 - (projected[a.name] ?? 1))
  );

  return (
    <div className="flex flex-col gap-4 max-w-5xl">

      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Scenario Modeler</h1>
        <p className="mt-1 text-sm text-gray-500">
          Project your TrustQ Score under different program investment scenarios.
          Adjust each dimension&rsquo;s projected maturity level to see score impact in real time.
        </p>
      </div>

      {/* ---- Two-column layout: sticky left panel + scrollable sliders ---- */}
      <div className="flex gap-6 items-start">

        {/* LEFT: sticky score panel */}
        <div className="w-56 shrink-0 sticky top-6 flex flex-col gap-4">

          {/* Sandbox notice */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
            <svg className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <p className="text-[11px] text-amber-800 leading-snug">
              <span className="font-semibold">Sandbox only.</span> No data is saved. Your official TrustQ Score is not affected.
            </p>
          </div>

          {/* Baseline score */}
          <div className="rounded-xl bg-white border border-gray-200 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Current Baseline
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl font-bold tabular-nums ${scoreColor(displayBaseline)}`}>
                {displayBaseline}
              </span>
              <span className="text-sm text-gray-400">/ 100</span>
            </div>
            <span className={`mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${scoreBadgeClass(displayBaseline)}`}>
              {scoreLabel(displayBaseline)}
            </span>
            {baseline.length === 0 && (
              <p className="mt-2 text-[10px] text-gray-400 leading-snug">No assessment on file — all dimensions default to 1.0.</p>
            )}
          </div>

          {/* Projected score */}
          <div className={`rounded-xl border-2 px-4 py-4 transition-colors ${
            delta > 0 ? "bg-green-50 border-green-300" :
            delta < 0 ? "bg-red-50 border-red-300" :
                        "bg-white border-gray-200"
          }`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Projected Score
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl font-bold tabular-nums ${scoreColor(projectedTotal)}`}>
                {projectedTotal}
              </span>
              <span className="text-sm text-gray-400">/ 100</span>
            </div>
            <span className={`mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${scoreBadgeClass(projectedTotal)}`}>
              {scoreLabel(projectedTotal)}
            </span>
            {hasChanges && (
              <p className={`mt-2 text-sm font-bold tabular-nums ${delta > 0 ? "text-green-700" : "text-red-600"}`}>
                {delta > 0 ? "▲ +" : "▼ "}{delta} pts
              </p>
            )}
          </div>

          {/* Reset button */}
          {hasChanges && (
            <button
              onClick={resetAll}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Reset to baseline
            </button>
          )}
        </div>

        {/* RIGHT: sliders */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Dimension targets</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              1 = Absent → 5 = Embedded. Higher-weight dimensions drive more score movement per point.
            </p>
          </div>

          <div className="flex flex-col gap-3">
          {DIMENSIONS.map((dim) => {
            const base      = baselineMap[dim.name] ?? 1;
            const proj      = projected[dim.name] ?? 1;
            const dimDelta  = proj - base;
            const weightPct = Math.round(dim.weight * 100);
            // Score points this dimension contributes at current projected level
            const contribution = Math.round(((proj * dim.weight) / 5) * 100);

            return (
              <div key={dim.name} className="rounded-xl bg-white border border-gray-200 px-5 py-4">

                {/* Dimension header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{dim.name}</span>
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                        {weightPct}% weight
                      </span>
                      {dimDelta !== 0 && (
                        <span className={`text-xs font-semibold tabular-nums ${dimDelta > 0 ? "text-green-600" : "text-red-500"}`}>
                          {dimDelta > 0 ? "▲ +" : "▼ "}
                          {dimDelta.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400 truncate">{dim.resourceDriver}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold tabular-nums ${
                      proj >= 4 ? "text-green-600" : proj >= 3 ? "text-amber-500" : "text-red-500"
                    }`}>
                      {proj.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-gray-400">{maturityLabel(proj)}</p>
                  </div>
                </div>

                {/* Slider */}
                <div className="relative">
                  {/* Baseline marker */}
                  <div
                    className="absolute top-0 -translate-y-1 w-0.5 h-4 bg-gray-300 rounded-full"
                    style={{ left: `calc(${((base - 1) / 4) * 100}% - 1px)` }}
                    title={`Baseline: ${base.toFixed(1)}`}
                  />
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.1}
                    value={proj}
                    onChange={(e) => handleSlider(dim.name, parseFloat(e.target.value))}
                    className="w-full h-2 appearance-none rounded-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #2563eb ${((proj - 1) / 4) * 100}%, #e5e7eb ${((proj - 1) / 4) * 100}%)`,
                    }}
                  />
                </div>

                {/* Scale labels + score contribution */}
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <span key={v} className="text-[10px] text-gray-300 tabular-nums">
                        {v}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    Contributes {contribution} pts
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        </div>{/* end sliders */}
      </div>{/* end two-column */}

      {/* ---- Highest-impact opportunities ---- */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          Highest-impact improvement opportunities
        </h2>
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Dimension</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Weight</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Projected</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Gap to 5</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Max uplift</th>
              </tr>
            </thead>
            <tbody>
              {sortedByImpact.map((dim, i) => {
                const proj       = projected[dim.name] ?? 1;
                const gap        = 5 - proj;
                const maxUplift  = Math.round((gap * dim.weight / 5) * 100);
                return (
                  <tr key={dim.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-800">{dim.name}</td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{Math.round(dim.weight * 100)}%</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      proj >= 4 ? "text-green-600" : proj >= 3 ? "text-amber-500" : "text-red-500"
                    }`}>
                      {proj.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                      {gap.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">
                      +{maxUplift} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          &ldquo;Max uplift&rdquo; is the TrustQ points available if this dimension reaches 5.0 (Embedded) from its current projected level.
        </p>
      </section>

    </div>{/* end outer flex col */}
  );
}
