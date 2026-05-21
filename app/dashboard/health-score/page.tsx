import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = { title: "TrustQ Score" };

// ---------------------------------------------------------------------------
// /dashboard/health-score — TrustQ Score placeholder.
// TODO: Fetch and display the composite score breakdown by dimension.
// TODO: Show historical score trend with comparison period selector.
// TODO: Surface top improvement recommendations ranked by impact.
// ---------------------------------------------------------------------------
export default function TrustQScorePage() {
  return (
    <ComingSoonPage
      title="TrustQ Score"
      description="Your organization's TrustQ Score is calculated from the Diagnostic Assessment and benchmarked against peer organizations in your industry."
      features={[
        "Score breakdown across six program dimensions",
        "Percentile ranking vs. industry peers",
        "Historical trend chart with period comparison",
        "Prioritized recommendations to improve your TrustQ Score",
      ]}
    />
  );
}
