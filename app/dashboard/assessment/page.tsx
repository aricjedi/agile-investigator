import { redirect }        from "next/navigation";
import { createClient }    from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// /dashboard/assessment — Entry gate for the v2 diagnostic assessment.
//
// Flow:
//   1. Find or create a draft assessment for the user's org.
//   2. If the assessment has no org profile yet → /org-profile?assessment=<id>
//   3. If the assessment already has an org profile → /assessment/<id>
// ---------------------------------------------------------------------------
export default async function AssessmentEntryPage() {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("user_id", user.id)
    .returns<{ id: string; organization_id: string | null }[]>()
    .single();

  if (!profile?.organization_id) redirect("/auth/login");

  // Look for an existing draft — resume if found
  const { data: draft } = await supabase
    .from("assessments")
    .select("id, org_profile_id")
    .eq("organization_id", profile.organization_id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<{ id: string; org_profile_id: string | null }[]>()
    .maybeSingle();

  let assessmentId: string;
  let orgProfileId: string | null;

  if (draft) {
    assessmentId = draft.id;
    orgProfileId = draft.org_profile_id;
  } else {
    // Create a new draft
    const { data: newAssessment, error } = await supabase
      .from("assessments")
      .insert({
        organization_id: profile.organization_id,
        created_by:      profile.id,
        status:          "draft",
      } as unknown as never)
      .select("id")
      .returns<{ id: string }[]>()
      .single();

    if (error || !newAssessment) {
      return (
        <div className="p-8 text-sm text-red-600">
          Could not start assessment. Please refresh and try again.
        </div>
      );
    }

    assessmentId = newAssessment.id;
    orgProfileId = null;
  }

  // Check if org already has a profile (even if not yet linked to this assessment)
  if (!orgProfileId) {
    const { data: existingProfile } = await admin
      .from("org_profiles")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .returns<{ id: string }[]>()
      .maybeSingle();

    if (existingProfile) {
      // Link the existing profile to this assessment and skip the profile step
      await admin
        .from("assessments")
        .update({ org_profile_id: existingProfile.id } as unknown as never)
        .eq("id", assessmentId);

      redirect(`/dashboard/assessment/${assessmentId}`);
    }

    // No profile exists — capture it first
    redirect(`/dashboard/assessment/org-profile?assessment=${assessmentId}`);
  }

  redirect(`/dashboard/assessment/${assessmentId}`);
}
