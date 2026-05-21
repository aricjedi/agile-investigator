import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = { title: "Metrics Dashboard" };

// ---------------------------------------------------------------------------
// /dashboard/metrics — Metrics Dashboard placeholder.
// TODO: Connect to investigations data source (intake, resolution, aging).
// TODO: Add configurable date range and filter controls.
// TODO: Add exportable data tables alongside charts.
// ---------------------------------------------------------------------------
export default function MetricsDashboardPage() {
  return (
    <ComingSoonPage
      title="Metrics Dashboard"
      description="Track key performance indicators across your full investigations lifecycle — from report intake through resolution and closure."
      features={[
        "Case volume, aging, and resolution time KPIs",
        "Intake channel breakdown (hotline, email, web, etc.)",
        "Substantiation rates by allegation category",
        "Configurable date range and segment filters",
      ]}
    />
  );
}
