import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientLayout from "@/components/layouts/ClientLayout";

// ---------------------------------------------------------------------------
// /dashboard layout — Server Component guard.
// Middleware handles the first pass; this is a defense-in-depth check.
// ---------------------------------------------------------------------------
export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .returns<{ role: string }[]>()
    .single();

  // Admins who land on /dashboard get redirected to their own area.
  if (profile?.role === "admin") {
    redirect("/admin");
  }

  if (!profile || !["client", "viewer"].includes(profile.role)) {
    // No profile yet — user signed up but hasn't been provisioned to an org.
    // TODO: redirect to an onboarding/pending page instead.
    redirect("/auth/login");
  }

  return <ClientLayout>{children}</ClientLayout>;
}
