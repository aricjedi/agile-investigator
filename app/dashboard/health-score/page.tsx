import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// /dashboard/health-score — permanently redirected to /dashboard/trustq-score.
// Old route kept alive so any bookmarked or linked URLs continue to work.
// ---------------------------------------------------------------------------
export default function HealthScoreRedirect() {
  redirect("/dashboard/trustq-score");
}
