"use client";

// ---------------------------------------------------------------------------
// DiagnosticWizard — v2 diagnostic assessment.
//
// Replaces the 46-question per-indicator wizard with a nine-dimension
// rubric-selection interface.  For each dimension the assessor reads the
// five maturity anchor descriptions and selects the level that best describes
// the organization's current state.
//
// Step model:
//   steps 0–8  → one dimension per step (DIMENSION_RUBRICS)
//   step 9     → summary + submit
//
// Auto-saves on every Next/Back click (idempotent server action).
// ---------------------------------------------------------------------------

import { useState, useMemo } from "react";
import { useRouter }         from "next/navigation";
import {
  DIMENSION_RUBRICS,
  type MaturityScore,
  type DimensionTargets,
} from "@/lib/assessment/rubrics";
import {
  saveDimensionRating,
  submitAssessmentV2,
} from "@/app/dashboard/assessment/actions";

interface Props {
  assessmentId:    string;
  targets:         DimensionTargets; // computed from org profile, passed from server
  /** Pre-populated from DB — allows resuming a draft */
  existingRatings: Record<string, number>; // dimensionId → 1–5
}

const SUMMARY_STEP = DIMENSION_RUBRICS.length; // 9

const MATURITY_COLORS: Record<number, { bg: string; border: string; text: string; dot: string }> = {
  1: { bg: "bg-red-50",    border: "border-red-300",    text: "text-red-700",    dot: "bg-red-400"    },
  2: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", dot: "bg-orange-400" },
  3: { bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  dot: "bg-amber-400"  },
  4: { bg: "bg-brand-50",  border: "border-brand-300",  text: "text-brand-700",  dot: "bg-brand-400"  },
  5: { bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  dot: "bg-green-400"  },
};

export function DiagnosticWizard({ assessmentId, targets, existingRatings }: Props) {
  const router = useRouter();

  const [ratings,     setRatings]     = useState<Record<string, number>>(existingRatings);
  const [step,        setStep]        = useState(0);
  const [isSaving,    setIsSaving]    = useState(false);
  const [isSubmitting,setIsSubmitting]= useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentDim = step < SUMMARY_STEP ? DIMENSION_RUBRICS[step] : null;

  // Progress: count how many of the nine dimensions have a rating
  const ratedCount = DIMENSION_RUBRICS.filter(d => ratings[d.id] !== undefined).length;
  const progressPct = Math.round((ratedCount / DIMENSION_RUBRICS.length) * 100);

  // Live projected score for header display
  const projectedScore = useMemo(() => {
    let sum = 0;
    for (const dim of DIMENSION_RUBRICS) {
      const current = ratings[dim.id] ?? 1;
      const target  = targets[dim.id] ?? 3;
      sum += Math.min(current / target, 1) * dim.weight;
    }
    return Math.round(sum * 100);
  }, [ratings, targets]);

  async function handleNext() {
    if (!currentDim || isSaving) return;
    setIsSaving(true);
    try {
      const score = ratings[currentDim.id];
      if (score !== undefined) {
        await saveDimensionRating(assessmentId, currentDim.id, score as MaturityScore);
      }
      setStep((s) => s + 1);
    } catch { /* non-fatal — re-saves on next nav */ }
    finally { setIsSaving(false); }
  }

  async function handleBack() {
    if (step === 0 || isSaving) return;
    setIsSaving(true);
    try {
      if (currentDim) {
        const score = ratings[currentDim.id];
        if (score !== undefined) {
          await saveDimensionRating(assessmentId, currentDim.id, score as MaturityScore);
        }
      }
      setStep((s) => s - 1);
    } catch { /* non-fatal */ }
    finally { setIsSaving(false); }
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitAssessmentV2(assessmentId);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setSubmitError("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  }

  // ---- Summary step ----
  if (step === SUMMARY_STEP) {
    return (
      <SummaryPage
        ratings={ratings}
        targets={targets}
        projectedScore={projectedScore}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onBack={handleBack}
        onSubmit={handleSubmit}
      />
    );
  }

  // ---- Dimension step ----
  const dim = currentDim!;
  const target = targets[dim.id] ?? 3;
  const selected = ratings[dim.id] as MaturityScore | undefined;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* Progress + projected score */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Dimension {step + 1} of {DIMENSION_RUBRICS.length}</span>
            <span className="font-medium">{progressPct}% rated</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Projected
          </p>
          <p className={`text-xl font-bold tabular-nums ${
            projectedScore >= 71 ? "text-green-600" : projectedScore >= 41 ? "text-amber-500" : "text-red-500"
          }`}>
            {projectedScore}<span className="text-xs font-normal text-gray-400"> / 100</span>
          </p>
        </div>
      </div>

      {/* Dimension header */}
      <div className="rounded-xl bg-white border border-gray-200 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-0.5">
              {Math.round(dim.weight * 100)}% of total score
            </p>
            <h1 className="text-xl font-semibold text-gray-900">{dim.name}</h1>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{dim.riskAxis}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              Target
            </p>
            <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold ${
              MATURITY_COLORS[target]?.bg
            } ${MATURITY_COLORS[target]?.border} ${MATURITY_COLORS[target]?.text}`}>
              <span>{target}</span>
              <span className="text-xs font-medium opacity-80">/ 5</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{dim.targetNote.split(".")[0]}.</p>
          </div>
        </div>
      </div>

      {/* Rubric level cards — select current maturity */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Select the level that best describes current state
        </p>
        <div className="flex flex-col gap-2.5">
          {dim.levels.map((level) => {
            const isSelected = selected === level.level;
            const isTarget   = level.level === target;
            const colors     = MATURITY_COLORS[level.level];

            return (
              <button
                key={level.level}
                type="button"
                onClick={() => setRatings(prev => ({ ...prev, [dim.id]: level.level }))}
                className={`w-full rounded-xl border-2 px-4 py-4 text-left transition-all ${
                  isSelected
                    ? `${colors.border} ${colors.bg}`
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Level badge */}
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                    isSelected ? `${colors.bg} ${colors.text} border ${colors.border}` : "bg-gray-100 text-gray-600"
                  }`}>
                    {level.level}
                  </div>

                  {/* Anchor text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${isSelected ? colors.text : "text-gray-800"}`}>
                        {level.label}
                      </span>
                      {isTarget && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 border border-brand-200 rounded px-1.5 py-0.5">
                          Target
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${isSelected ? "text-gray-700" : "text-gray-500"}`}>
                      {level.anchor}
                    </p>
                    {level.notes && (
                      <p className={`mt-1.5 text-[11px] italic leading-relaxed ${isSelected ? "text-gray-500" : "text-gray-400"}`}>
                        {level.notes}
                      </p>
                    )}
                  </div>

                  {/* Selected indicator */}
                  <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? `${colors.border} ${colors.bg}` : "border-gray-300"
                  }`}>
                    {isSelected && (
                      <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target note */}
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-600">Why this target: </span>
          {dim.targetNote}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0 || isSaving}
          className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Saving…" : step === DIMENSION_RUBRICS.length - 1 ? "Review & Submit" : (
            <>Next <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryPage
// ---------------------------------------------------------------------------
function SummaryPage({
  ratings,
  targets,
  projectedScore,
  isSaving,
  isSubmitting,
  submitError,
  onBack,
  onSubmit,
}: {
  ratings:        Record<string, number>;
  targets:        DimensionTargets;
  projectedScore: number;
  isSaving:       boolean;
  isSubmitting:   boolean;
  submitError:    string | null;
  onBack:         () => void;
  onSubmit:       () => void;
}) {
  const unrated = DIMENSION_RUBRICS.filter(d => ratings[d.id] === undefined);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Review & Submit</h1>
        <p className="mt-1 text-sm text-gray-500">
          Confirm your ratings below. Unrated dimensions default to 1 (Absent).
        </p>
      </div>

      {/* Projected score hero */}
      <div className="rounded-xl bg-white border border-gray-200 px-6 py-5 flex items-center gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Projected TrustQ Score</p>
          <p className={`text-5xl font-bold tabular-nums ${
            projectedScore >= 71 ? "text-green-600" : projectedScore >= 41 ? "text-amber-500" : "text-red-500"
          }`}>
            {projectedScore}
            <span className="text-lg font-normal text-gray-400"> / 100</span>
          </p>
        </div>
        <div className="flex-1 text-xs text-gray-400 leading-relaxed">
          Score measures fit-to-risk: each dimension contribution is capped at 100%
          of its weight when current rating meets or exceeds the target.
          Over-investment does not raise the score above target.
        </div>
      </div>

      {/* Dimension summary table */}
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dimension</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Wt.</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Current</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Target</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Gap</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DIMENSION_RUBRICS.map((dim) => {
              const current  = ratings[dim.id] ?? 1;
              const target   = targets[dim.id] ?? 3;
              const ratio    = Math.min(current / target, 1);
              const pts      = Math.round(ratio * dim.weight * 100);
              const gap      = Math.max(target - current, 0);
              const atTarget = current >= target;
              return (
                <tr key={dim.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs">{dim.name}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{Math.round(dim.weight * 100)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold tabular-nums ${
                      ratings[dim.id] === undefined ? "text-gray-300" :
                      atTarget ? "text-green-600" : "text-amber-600"
                    }`}>
                      {ratings[dim.id] ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{target}</td>
                  <td className="px-4 py-3 text-center">
                    {gap > 0 ? (
                      <span className="text-xs font-semibold text-red-500">-{gap}</span>
                    ) : (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-semibold text-gray-700 tabular-nums">{pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unrated.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          {unrated.length} dimension{unrated.length > 1 ? "s" : ""} unrated ({unrated.map(d => d.name).join(", ")}). Unrated dimensions are scored as 1 (Absent).
        </div>
      )}

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{submitError}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSaving || isSubmitting}
          className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Calculating score…" : "Submit Assessment"}
        </button>
      </div>
    </div>
  );
}
