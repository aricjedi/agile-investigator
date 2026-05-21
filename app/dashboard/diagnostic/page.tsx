import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// /dashboard/diagnostic — Permanent redirect to /dashboard/assessment.
// The canonical route for the diagnostic assessment is /dashboard/assessment.
// This page preserves any existing bookmarks or linked URLs.
// ---------------------------------------------------------------------------
export default function DiagnosticRedirectPage() {
  redirect("/dashboard/assessment");
}
