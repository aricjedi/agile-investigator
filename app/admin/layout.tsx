import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLayout from "@/components/layouts/AdminLayout";

// ---------------------------------------------------------------------------
// /admin layout — Server Component guard.
// Middleware catches most unauthorized requests, but this adds a second layer
// of protection in case middleware is bypassed (e.g. direct function invoke).
// ---------------------------------------------------------------------------
export default async function AdminRouteLayout({
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

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
