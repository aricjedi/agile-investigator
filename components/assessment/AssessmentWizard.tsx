"use client";

// ---------------------------------------------------------------------------
// AssessmentWizard — drives the full 46-question diagnostic assessment.
//
// One dimension is displayed per "page". Navigating forward or backward
// auto-saves the current dimension's responses to the database via server
// actions. A summary page is shown before final submission.
//
// State model:
//   step 0–8  → dimension pages (DIMENSIONS[step])
//   step 9    → summary + submit
//
// Auto-save fires on every Next/Back click. If a dimension has no answers
// yet nothing is saved (the server action is a no-op for empty objects).
//
// TODO: add keyboard arrow-key navigation between score options.
// TODO: add "Save and exit" button that returns to /dashboard.
// TODO: support reviewer role with read-only view of submitted answers.
// ---------------------------------------------------------------------------

import { useState }     from "react";
import { useRouter }    from "next/navigation";
import { DIMENSIONS, TOTAL_QUESTIONS, SCORE_LABELS } from "@/lib/assessment/questions";
import { saveResponses, submitAssessment }             from "@/app/dashboard/assessment/actions";

interface Props {
  assessmentId:      string;
  /** Pre-populated from the database — allows resuming a draft. */
  existingResponses: Record<string, Record<number, number>>;
}

const SUMMARY_STEP = DIMENSIONS.length; // index 9 = summary page

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export function AssessmentWizard({ assessmentId, existingResponses }: Props) {
  const router = useRouter();

  // All responses across all dimensions
  const [responses, setResponses] = useState<Record<string, Record<number, number>>>(
    existingResponses
  );
  const [step, setStep]               = useState(0);
  const [isSaving, setIsSaving]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ---- Derived state ----
  const currentDim = step < SUMMARY_STEP ? DIMENSIONS[step] : null;

  // Total questions answered across all dimensions (for progress bar)
  const totalAnswered = Object.values(responses).reduce(
    (sum, dimResp) => sum + Object.keys(dimResp).length,
    0
  );
  const progressPct = Math.round((totalAnswered / TOTAL_QUESTIONS) * 100);

  const currentDimResponses = currentDim ? (responses[currentDim.name] ?? {}) : {};
  const currentAnswered     = Object.keys(currentDimResponses).length;
  const currentTotal        = currentDim?.questions.length ?? 0;

  // ---- Handlers ----
  function setResponse(questionIndex: number, score: number) {
    if (!currentDim) return;
    setResponses((prev) => ({
      ...prev,
      [currentDim.name]: { ...(prev[currentDim.name] ?? {}), [questionIndex]: score },
    }));
  }

  async function handleNext() {
    if (!currentDim || isSaving) return;
    setIsSaving(true);
    try {
      const dimResp = responses[currentDim.name] ?? {};
      if (Object.keys(dimResp).length > 0) {
        await saveResponses(assessmentId, currentDim.name, dimResp);
      }
      setStep((s) => s + 1);
    } catch {
      // Non-fatal: responses are re-saved on next navigation
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBack() {
    if (step === 0 || isSaving) return;
    setIsSaving(true);
    try {
      if (currentDim) {
        const dimResp = responses[currentDim.name] ?? {};
        if (Object.keys(dimResp).length > 0) {
          await saveResponses(assessmentId, currentDim.name, dimResp);
        }
      }
      setStep((s) => s - 1);
    } catch {
      // Non-fatal
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitAssessment(assessmentId);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setSubmitError("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  }

  // ---- Summary page ----
  if (step === SUMMARY_STEP) {
    return (
      <SummaryPage
        responses={responses}
        progressPct={progressPct}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onBack={handleBack}
        onSubmit={handleSubmit}
      />
    );
  }

  // ---- Dimension page ----
  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* Progress */}
      <ProgressBar
        label={`Section ${step + 1} of ${DIMENSIONS.length}`}
        pct={progressPct}
      />

      {/* Section header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">
          {currentDim!.name}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">
          {currentDim!.name}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {currentAnswered} of {currentTotal} answered
          {currentDim!.weight !== undefined && (
            <span className="ml-2 text-gray-300">
              · {Math.round(currentDim!.weight * 100)}% of total score
            </span>
          )}
        </p>
      </div>

      {/* Scale legend */}
      <div className="flex items-center gap-4 flex-wrap rounded-lg bg-gray-50 border border-gray-100 px-4 py-2.5 text-xs">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="text-gray-500">
            <span className="font-semibold text-gray-700">{n}</span>
            {" = "}
            {SCORE_LABELS[n]}
          </span>
        ))}
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-4">
        {currentDim!.questions.map((q, i) => {
          const selected = currentDimResponses[i];
          return (
            <QuestionCard
              key={i}
              index={i}
              text={q.text}
              selected={selected}
              onSelect={(score) => setResponse(i, score)}
            />
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
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
          {isSaving ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : step === DIMENSIONS.length - 1 ? (
            "Review & Submit"
          ) : (
            <>
              Next Section
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionCard
// ---------------------------------------------------------------------------
function QuestionCard({
  index,
  text,
  selected,
  onSelect,
}: {
  index:    number;
  text:     string;
  selected: number | undefined;
  onSelect: (score: number) => void;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 flex flex-col gap-4">
      <p className="text-sm font-medium text-gray-800 leading-relaxed">
        <span className="text-gray-300 mr-2 select-none">{index + 1}.</span>
        {text}
      </p>

      {/* Score buttons */}
      <div className="flex items-stretch gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((score) => {
          const isSelected = selected === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onSelect(score)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 rounded-lg border-2 min-w-[60px] transition-all ${
                isSelected
                  ? "border-brand-600 bg-brand-50 shadow-sm"
                  : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/40"
              }`}
            >
              <span
                className={`text-base font-bold leading-none ${
                  isSelected ? "text-brand-700" : "text-gray-700"
                }`}
              >
                {score}
              </span>
              <span
                className={`text-[9px] font-medium uppercase tracking-wide leading-tight text-center ${
                  isSelected ? "text-brand-500" : "text-gray-400"
                }`}
              >
                {SCORE_LABELS[score]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryPage
// ---------------------------------------------------------------------------
function SummaryPage({
  responses,
  progressPct,
  isSaving,
  isSubmitting,
  submitError,
  onBack,
  onSubmit,
}: {
  responses:    Record<string, Record<number, number>>;
  progressPct:  number;
  isSaving:     boolean;
  isSubmitting: boolean;
  submitError:  string | null;
  onBack:       () => void;
  onSubmit:     () => void;
}) {
  const totalAnswered = Object.values(responses).reduce(
    (sum, r) => sum + Object.keys(r).length,
    0
  );
  const allAnswered = totalAnswered === TOTAL_QUESTIONS;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      <ProgressBar label="Review & Submit" pct={progressPct} />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Review & Submit</h1>
        <p className="mt-1 text-sm text-gray-500">
          Confirm your responses below. Unanswered questions are scored as{" "}
          <strong>1 — Absent</strong> and will lower your TrustQ Score.
        </p>
      </div>

      {/* Dimension completion list */}
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {DIMENSIONS.map((dim) => {
          const answered = Object.keys(responses[dim.name] ?? {}).length;
          const total    = dim.questions.length;
          const complete = answered === total;
          const partial  = answered > 0 && !complete;

          return (
            <div key={dim.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    complete ? "bg-green-500" : partial ? "bg-amber-400" : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-800">{dim.name}</span>
              </div>
              <span
                className={`text-xs font-medium ${
                  complete ? "text-green-600" : partial ? "text-amber-600" : "text-gray-400"
                }`}
              >
                {answered}/{total}
              </span>
            </div>
          );
        })}
      </div>

      {/* Warning for incomplete responses */}
      {!allAnswered && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <svg
            className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="text-sm text-amber-700">
            {TOTAL_QUESTIONS - totalAnswered} question
            {TOTAL_QUESTIONS - totalAnswered !== 1 ? "s" : ""} unanswered. You can go
            back to complete them, or submit now — unanswered questions will be scored as 1 (Absent).
          </p>
        </div>
      )}

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Actions */}
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
          {isSubmitting ? (
            <>
              <Spinner />
              Calculating score…
            </>
          ) : (
            "Submit Assessment"
          )}
        </button>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------
function ProgressBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-medium">{pct}% complete</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
