"use client";

// ---------------------------------------------------------------------------
// ScoreHistoryTable — expandable assessment history for /dashboard/trustq-score.
//
// Each row shows: date, TrustQ Score, change vs. previous, expand toggle.
// Expanded row reveals all 9 dimension scores in a mini breakdown table.
//
// Props:
//   rows      — score history entries, newest-first (server pre-sorted)
//   dimScores — map of assessmentId → DimRow[] fetched by the server component
//
// TODO: add "Download PDF" per assessment row when reporting sprint begins.
// TODO: link to the full assessment response view once that page is built.
// ---------------------------------------------------------------------------

import { useState } from "react";

export interface HistoryRow {
  id:            string;
  assessment_id: string;
  trustq_score:  number;
  scored_at:     string;
  notes:         string | null;
}

export interface DimRow {
  dimension:      string;
  raw_score:      number;
  weighted_score: number;
  weight:         number;
}

interface Props {
  rows:      HistoryRow[];
  dimScores: Record<string, DimRow[]>; // assessmentId → dims
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });
}

function scoreBadgeClass(score: number): string {
  if (score >= 71) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 41) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function ChangePill({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-xs text-gray-300">—</span>;
  }
  if (delta === 0) {
    return <span className="text-xs text-gray-400">±0</span>;
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold ${
        positive ? "text-green-600" : "text-red-500"
      }`}
    >
      {positive ? "+" : ""}
      {delta}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Dimension breakdown sub-row
// ---------------------------------------------------------------------------
function DimBreakdown({ dims }: { dims: DimRow[] }) {
  if (dims.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic px-1">
        Dimension data unavailable.
      </p>
    );
  }

  // Sort best → worst by raw_score
  const sorted = [...dims].sort((a, b) => b.raw_score - a.raw_score);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {sorted.map((d) => {
        const pct = Math.round((d.raw_score / 5) * 100);
        const barColor =
          d.raw_score >= 3.6
            ? "bg-green-500"
            : d.raw_score >= 2.1
            ? "bg-amber-400"
            : "bg-red-400";
        return (
          <div key={d.dimension}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-gray-600 truncate">
                {d.dimension}
              </span>
              <span className="text-[11px] font-semibold text-gray-500 ml-2 shrink-0 tabular-nums">
                {d.raw_score.toFixed(1)}
                <span className="font-normal text-gray-300">/5</span>
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ScoreHistoryTable({ rows, dimScores }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        No completed assessments yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_100px_80px_36px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
        <span>Date</span>
        <span className="text-center">TrustQ Score</span>
        <span className="text-center">Change</span>
        <span />
      </div>

      {rows.map((row, idx) => {
        const prev     = rows[idx + 1]; // rows are newest-first
        const delta    = prev ? Math.round(row.trustq_score - prev.trustq_score) : null;
        const isOpen   = expandedId === row.id;
        const dims     = dimScores[row.assessment_id] ?? [];

        return (
          <div
            key={row.id}
            className="border-b border-gray-100 last:border-0"
          >
            {/* Main row */}
            <button
              onClick={() => setExpandedId(isOpen ? null : row.id)}
              className="w-full grid grid-cols-[1fr_100px_80px_36px] gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              aria-expanded={isOpen}
            >
              {/* Date */}
              <span className="text-sm text-gray-700 font-medium">
                {formatDate(row.scored_at)}
              </span>

              {/* Score badge */}
              <span className="flex justify-center">
                <span
                  className={`inline-block text-sm font-bold px-2.5 py-0.5 rounded-full border tabular-nums ${scoreBadgeClass(row.trustq_score)}`}
                >
                  {row.trustq_score}
                </span>
              </span>

              {/* Change vs. previous */}
              <span className="flex justify-center items-center">
                <ChangePill delta={delta} />
              </span>

              {/* Expand chevron */}
              <span className="flex justify-center items-center text-gray-300">
                <svg
                  className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {/* Expanded dimension breakdown */}
            {isOpen && (
              <div className="px-5 pb-5 pt-1 bg-gray-50 border-t border-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Dimension breakdown
                </p>
                <DimBreakdown dims={dims} />
                {row.notes && (
                  <p className="mt-3 text-xs text-gray-400 italic">
                    Note: {row.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
