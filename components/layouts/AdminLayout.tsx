import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandLogo } from "@/components/BrandLogo";
import { SignOutButton } from "@/components/SignOutButton";
import type { Organization } from "@/types/database";

// ---------------------------------------------------------------------------
// AdminLayout — server component that wraps all /admin/* pages.
// Uses the service-role client so all organizations are visible regardless
// of the logged-in user's org membership.
// TODO: add org search/filter once org count grows past ~20.
// TODO: add keyboard shortcut to toggle sidebar collapse.
// ---------------------------------------------------------------------------
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAdminClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, status, health_score")
    .returns<Organization[]>()
    .order("name");

  const organizations: Organization[] = orgs ?? [];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ------------------------------------------------------------------ */}
      {/* Sidebar                                                              */}
      {/* ------------------------------------------------------------------ */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <BrandLogo href="/admin" size="sm" />
          <span className="mt-0.5 rounded bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-600 uppercase tracking-wide shrink-0">
            Admin
          </span>
        </div>

        {/* Primary navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          <SidebarLink href="/admin" label="Overview" />
          {/* TODO: add /admin/users, /admin/billing, /admin/settings nav items */}

          {/* Organizations section */}
          <div className="mt-5 mb-1 px-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Organizations
            </span>
            <Link
              href="/admin/organizations/new"
              title="Create organization"
              className="rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors"
            >
              {/* Plus icon */}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>

          {organizations.length === 0 ? (
            <p className="px-2 text-xs text-gray-400 italic">No organizations yet.</p>
          ) : (
            organizations.map((org) => (
              <SidebarOrgItem key={org.id} org={org} />
            ))
          )}
        </nav>

        {/* Bottom utility links */}
        <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-1">
          {/* TODO: /admin/settings page */}
          <SidebarLink href="/admin/settings" label="Settings" />
          <SignOutButton />
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Main content area                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
          {/* TODO: global search input */}
          <div className="ml-auto flex items-center gap-3">
            {/* TODO: notification bell */}
            {/* TODO: logged-in admin name + avatar dropdown */}
            <span className="text-xs text-gray-400">Admin Console</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-3 px-6 text-xs text-gray-400 text-right shrink-0">
          © 2026 TrustQ. Powered by Astris Integrity. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SidebarLink({ href, label }: { href: string; label: string }) {
  // TODO: replace with a "use client" NavLink using usePathname() for active state
  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      {label}
    </Link>
  );
}

function SidebarOrgItem({ org }: { org: Organization }) {
  const dot = org.status === "active" ? "bg-green-400" : "bg-gray-300";

  return (
    <Link
      href={`/admin/organizations/${org.slug}`}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className="flex-1 truncate">{org.name}</span>
      {org.health_score !== null && (
        <span className="text-xs font-medium text-gray-400 group-hover:text-gray-600">
          {org.health_score}
        </span>
      )}
    </Link>
  );
}
