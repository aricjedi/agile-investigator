// ---------------------------------------------------------------------------
// Scoring engine — pure functions, no I/O.
// Called server-side during submitAssessment to compute dimension and total scores.
//
// Formula:
//   dimension raw_score  = average of question scores (1–5)
//   dimension weighted   = raw_score × weight
//   total weighted sum   = Σ weighted scores  (max = 5.0 when all scores = 5)
//   TrustQ Score (0–100) = (total_weighted_sum / 5) × 100
//
// Unanswered questions default to 1 (Absent) — the conservative baseline.
// ---------------------------------------------------------------------------

import type { Dimension } from "./questions";

export interface DimensionScoreResult {
  dimension:      string;
  weight:         number;
  /** Mean of question scores (1–5) — unanswered questions default to 1 */
  raw_score:      number;
  /** raw_score × weight */
  weighted_score: number;
}

export interface AssessmentScoreResult {
  dimensionScores: DimensionScoreResult[];
  /** Final TrustQ Score, 0–100 */
  totalScore:      number;
}

/**
 * Calculate dimension and total scores from the stored response map.
 *
 * @param dimensions  - Ordered dimension definitions (from questions.ts)
 * @param responses   - Map of { dimensionName → { questionIndex → score } }
 */
export function calculateScores(
  dimensions: Dimension[],
  responses:  Record<string, Record<number, number>>
): AssessmentScoreResult {
  const dimensionScores: DimensionScoreResult[] = dimensions.map((dim) => {
    const dimResponses = responses[dim.name] ?? {};

    // Default unanswered questions to 1 (Absent)
    const scores = dim.questions.map((_, i) => dimResponses[i] ?? 1);
    const rawScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const weightedScore = rawScore * dim.weight;

    return {
      dimension:      dim.name,
      weight:         dim.weight,
      raw_score:      rawScore,
      weighted_score: weightedScore,
    };
  });

  // Maximum possible weighted sum = 5.0 (all scores = 5, weights sum = 1.0)
  const weightedSum = dimensionScores.reduce((sum, d) => sum + d.weighted_score, 0);
  const totalScore  = Math.round((weightedSum / 5) * 100);

  return { dimensionScores, totalScore };
}

/**
 * Returns a Tailwind text-color class for a 0–100 TrustQ Score.
 * 0–40: red, 41–70: yellow, 71–100: green.
 */
export function scoreColorClass(score: number): string {
  if (score >= 71) return "text-green-600";
  if (score >= 41) return "text-yellow-500";
  return "text-red-500";
}
