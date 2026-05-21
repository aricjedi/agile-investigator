"use client";

// ---------------------------------------------------------------------------
// ScoreSparkline — tiny inline recharts line for the admin org detail page.
//
// Shows up to 12 most-recent data points as a minimal line chart with no axes
// or grid — just the trend shape and colour-coded dots.
//
// TODO: expose onClick to navigate to org's full score history once an admin
//       score-history view is built.
// ---------------------------------------------------------------------------

import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface SparkDataPoint {
  date:  string;
  score: number;
}

interface Props {
  data: SparkDataPoint[];
}

function formatTooltipDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

function SparkTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: SparkDataPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const { date, score } = payload[0].payload;
  return (
    <div className="rounded border border-gray-200 bg-white px-2 py-1 shadow-sm text-[11px] leading-tight">
      <p className="text-gray-400">{formatTooltipDate(date)}</p>
      <p className="font-semibold text-gray-700">{score}</p>
    </div>
  );
}

export function ScoreSparkline({ data }: Props) {
  // Keep at most 12 points — oldest first
  const trimmed = data.slice(-12);

  if (trimmed.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={52}>
      <LineChart data={trimmed} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Tooltip content={<SparkTooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#6366f1"
          strokeWidth={1.5}
          dot={{ r: 2.5, fill: "#6366f1", stroke: "#fff", strokeWidth: 1 }}
          activeDot={{ r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 1.5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
