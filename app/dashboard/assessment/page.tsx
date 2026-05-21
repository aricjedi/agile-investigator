import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// /dashboard/assessment — Entry point for the diagnostic assessment.
//
// This Server Component checks for an existing draft assessment for the
// current user's organization. If one exists it redirects straight to it;
// otherwise it creates a new draft and redirects to that.
//
// No UI is rendered — this page is a redirect gate only.
// TODO: when multi-respondent averaging ships, show a list of past assessments
//       here instead of immediately redirecting to a new draft.
// ---------------------------------------------------------------------------
export default async function AssessmentEntryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("user_id", user.id)
    .returns<{ id: string; organization_id: string | null }[]>()
    .single();

  if (!profile?.organization_id) redirect("/auth/login");

  // Look for an existing draft — resume it if found
  const { data: draft } = await supabase
    .from("assessments")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<{ id: string }[]>()
    .maybeSingle();

  if (draft) {
    redirect(`/dashboard/assessment/${draft.id}`);
  }

  // No draft — create a new assessment
  const { data: assessment, error } = await supabase
    .from("assessments")
    .insert({
      organization_id: profile.organization_id,
      created_by:      profile.id,
      status:          "draft",
    } as unknown as never)
    .select("id")
    .returns<{ id: string }[]>()
    .single();

  if (error || !assessment) {
    // Fallback: show a minimal error rather than a blank redirect loop
    return (
      <div className="p-8 text-sm text-red-600">
        Could not start assessment. Please refresh and try again.
      </div>
    );
  }

  redirect(`/dashboard/assessment/${assessment.id}`);
}
