"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// SignOutButton — client component that calls supabase.auth.signOut() and
// redirects to the login page. Extracted so layout files stay as Server
// Components.
// ---------------------------------------------------------------------------
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={
        className ??
        "flex items-center rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full text-left"
      }
    >
      Sign out
    </button>
  );
}
