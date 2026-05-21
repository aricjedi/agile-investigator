"use client";

// ---------------------------------------------------------------------------
// TrustQScoreChart — recharts line chart of TrustQ Score over time.
//
// Props:
//   data       — array of { date: ISO string, score: number } sorted ascending
//   height     — chart area height in px (default 220)
//   showGrid   — whether to render CartesianGrid (default true)
//   compact    — compact label/margin mode for dashboard widget (default false)
//
// Score colour bands:
//   0–40  → red zone
//   41–70 → amber zone
//   71–100→ green zone
//
// TODO: add period selector (3 m / 6 m / 1 yr / all) once enough data exists.
// TODO: add target score reference line when benchmarks feature ships.
// ---------------------------------------------------------------------------

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export interface ScoreDataPoint {
  /** ISO 8601 timestamp — used for tooltip display */
  date:  string;
  /** 0–100 TrustQ Score */
  score: number;
}

interface Props {
  data:      ScoreDataPoint[];
  height?:   number;
  showGrid?: boolean;
  compact?:  boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAxisDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });
}

function formatTooltipDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });
}

function scoreColor(score: number): string {
  if (score >= 71) return "#16a34a"; // green-600
  if (score >= 41) return "#d97706"; // amber-600
  return "#dc2626";                   // red-600
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: ScoreDataPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const { date, score } = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs">
      <p className="text-gray-400 mb-1">{formatTooltipDate(date)}</p>
      <p className="font-semibold" style={{ color: scoreColor(score) }}>
        {score} / 100
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom dot — coloured by score zone
// ---------------------------------------------------------------------------
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ScoreDataPoint;
  index?: number;
  dataLength?: number;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={scoreColor(payload.score)}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TrustQScoreChart({
  data,
  height   = 220,
  showGrid = true,
  compact  = false,
}: Props) {
  if (data.length === 0) return null;

  const margin = compact
    ? { top: 8, right: 8, bottom: 4, left: 0 }
    : { top: 12, right: 24, bottom: 4, left: 0 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
            vertical={false}
          />
        )}

        {/* Threshold reference lines */}
        <ReferenceLine
          y={71}
          stroke="#16a34a"
          strokeDasharray="4 3"
          strokeOpacity={0.4}
          label={compact ? undefined : { value: "Good", position: "right", fontSize: 10, fill: "#16a34a" }}
        />
        <ReferenceLine
          y={41}
          stroke="#d97706"
          strokeDasharray="4 3"
          strokeOpacity={0.4}
          label={compact ? undefined : { value: "Fair", position: "right", fontSize: 10, fill: "#d97706" }}
        />

        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          dy={6}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tickCount={6}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={compact ? 28 : 32}
        />

        <Tooltip content={<CustomTooltip />} />

        <Line
          type="monotone"
          dataKey="score"
          stroke="#6366f1"   // indigo-500 — brand-ish neutral line
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
