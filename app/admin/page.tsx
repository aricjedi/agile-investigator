import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/types/database";

export const metadata: Metadata = { title: "Admin Overview" };

// ---------------------------------------------------------------------------
// /admin — Master admin dashboard.
// Shows a full organization list table with status, health score, and date.
//
// TODO: add org health distribution chart (Recharts or Chart.js).
// TODO: add recent cross-org activity feed.
// TODO: add column-level sorting on the table header.
// TODO: add CSV export button.
// ---------------------------------------------------------------------------
export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  // Fetch all orgs with full detail — service-role client bypasses RLS
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, slug, status, health_score, created_at")
    .order("created_at", { ascending: false });

  const organizations: Organization[] = orgs ?? [];

  // Summary counts for the stat cards
  const total  = organizations.length;
  const active = organizations.filter((o) => o.status === "active").length;
  const scored = organizations.filter((o) => o.health_score !== null).length;

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Page header ---- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
            All client organizations on the TrustQ platform.
          </p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New organization
        </Link>
      </div>

      {/* ---- Summary stat cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total"    value={total}  />
        <StatCard label="Active"   value={active} />
        <StatCard label="Scored"   value={scored} description="have a TrustQ Score" />
      </div>

      {/* ---- Error state ---- */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          Failed to load organizations: {error.message}
        </div>
      )}

      {/* ---- Empty state ---- */}
      {!error && organizations.length === 0 && (
        <div className="rounded-xl bg-white border border-dashed border-gray-300 px-6 py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-gray-500 font-medium">No organizations yet</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Create your first organization to onboard a client to the TrustQ platform.
          </p>
          <Link
            href="/admin/organizations/new"
            className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Create organization
          </Link>
        </div>
      )}

      {/* ---- Organizations table ---- */}
      {organizations.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <Th>Organization</Th>
                <Th>Status</Th>
                <Th>TrustQ Score</Th>
                <Th>Created</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {organizations.map((org) => (
                <OrgRow key={org.id} org={org} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Future charts ---- */}
      {/* TODO: TrustQ Score distribution chart */}
      {/* TODO: platform activity feed */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------
function OrgRow({ org }: { org: Organization }) {
  const created = new Date(org.created_at).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Name */}
      <td className="px-5 py-3.5 font-medium text-gray-900">
        <Link
          href={`/admin/organizations/${org.slug}`}
          className="hover:text-brand-600 transition-colors"
        >
          {org.name}
        </Link>
        <span className="block text-xs font-normal text-gray-400 mt-0.5">
          /{org.slug}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <StatusBadge status={org.status} />
      </td>

      {/* TrustQ Score */}
      <td className="px-5 py-3.5">
        {org.health_score !== null ? (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              org.health_score >= 75
                ? "text-green-600"
                : org.health_score >= 50
                ? "text-yellow-600"
                : "text-red-500"
            }`}
          >
            {org.health_score}
            <span className="text-xs font-normal text-gray-400">/ 100</span>
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Created date */}
      <td className="px-5 py-3.5 text-gray-500">{created}</td>

      {/* Actions */}
      <td className="px-5 py-3.5 text-right">
        <Link
          href={`/admin/organizations/${org.slug}`}
          className="text-xs text-brand-600 hover:underline font-medium"
        >
          View
        </Link>
        {/* TODO: add Edit and Delete actions (with confirmation dialog) */}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "active"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-gray-50 text-gray-500 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "active" ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {description && (
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}
