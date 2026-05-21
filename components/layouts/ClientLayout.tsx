import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/SignOutButton";
import type { Organization, Profile } from "@/types/database";

// ---------------------------------------------------------------------------
// ClientLayout â€” sidebar layout wrapping all /dashboard/* pages.
// Fetches the current user's organization and profile for the nav.
//
// TODO: add mobile drawer/hamburger nav.
// TODO: add notification bell in the top bar.
// TODO: add help center / support link at the bottom of the sidebar.
// TODO: highlight active nav item using usePathname() in a "use client" wrapper.
// ---------------------------------------------------------------------------
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("user_id", user?.id ?? "")
    .single();

  const profile = profileRow as (Profile & { organizations: Organization }) | null;
  const orgName = profile?.organizations?.name ?? "Your Organization";

  // Sidebar navigation items.
  // TODO: remove href="#" and add real routes as each feature ships.
  const navItems = [
    {
      href:  "/dashboard",
      label: "Overview",
      icon:  "home",
    },
    {
      href:  "/dashboard/assessment",
      label: "Diagnostic Assessment",
      icon:  "clipboard",
    },
    {
      href:  "/dashboard/health-score",
      label: "TrustQ Score",
      icon:  "chart-bar",
    },
    {
      href:  "/dashboard/metrics",
      label: "Metrics Dashboard",
      icon:  "chart-line",
    },
    {
      href:  "/dashboard/documents",
      label: "Document Review",
      icon:  "folder",
    },
  ] as const;

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">

        {/* Brand + org name */}
        <div className="px-5 py-4 border-b border-gray-100">
          <BrandLogo href="/dashboard" size="sm" />
          <p className="mt-2 text-xs font-medium text-gray-500 truncate" title={orgName}>
            {orgName}
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom: user + sign out */}
        <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-1">
          <div className="px-2.5 py-1">
            <p className="text-xs font-medium text-gray-700 truncate">
              {profile?.full_name ?? user?.email}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main content area                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
          <span className="text-sm font-medium text-gray-700 truncate">{orgName}</span>
          {/* TODO: add notification bell, global search */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>

        {/* Footer */}
        {/* TODO: add support link, version badge, compliance badge */}
        <footer className="border-t border-gray-100 py-3 px-6 text-xs text-gray-400 text-right shrink-0">
          Â© 2026 TrustQ. Powered by Astris Integrity. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavIcon â€” inline SVG icons matching each nav item
// ---------------------------------------------------------------------------
type IconName = "home" | "clipboard" | "chart-bar" | "chart-line" | "folder";

function NavIcon({ name }: { name: IconName }) {
  const cls = "w-4 h-4 shrink-0";
  switch (name) {
    case "home":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case "chart-bar":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "chart-line":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    case "folder":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      );
  }
}
