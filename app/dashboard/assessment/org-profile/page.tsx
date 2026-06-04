import { redirect }        from "next/navigation";
import type { Metadata }   from "next";
import { createClient }    from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrgProfileForm }  from "@/components/assessment/OrgProfileForm";
import type { OrgProfile } from "@/types/database";

export const metadata: Metadata = { title: "Organization Profile" };

// ---------------------------------------------------------------------------
// /dashboard/assessment/org-profile
//
// Step 1 of the v2 diagnostic flow.  Captures the Organization Profile
// that drives all nine dimension targets.  If the org already has a profile,
// the form pre-populates so the assessor can review/update before continuing.
//
// Query param: ?assessment=<id>  — passed by the entry page
// ---------------------------------------------------------------------------
export default async function OrgProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ assessment?: string }>;
}) {
  const { assessment: assessmentId } = await searchParams;
  if (!assessmentId) redirect("/dashboard/assessment");

  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", user.id)
    .returns<{ organization_id: string }[]>()
    .single();

  if (!profile?.organization_id) redirect("/auth/login");

  // Load existing org profile if one exists
  const { data: existing } = await admin
    .from("org_profiles")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .returns<OrgProfile[]>()
    .maybeSingle();

  return (
    <OrgProfileForm
      assessmentId={assessmentId}
      organizationId={profile.organization_id}
      existing={existing ?? undefined}
    />
  );
}
