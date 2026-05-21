import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/types/database";

// ---------------------------------------------------------------------------
// /admin/organizations/[slug] — Organization detail page.
//
// TODO: add edit functionality (org name, status) once edit sprint begins.
// TODO: add user management panel (invite, remove, change role).
// TODO: add org-scoped activity log.
// TODO: wire feature status cards to real completion data.
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("name")
    .eq("slug", slug)
    .single();
  return { title: data?.name ?? "Organization" };
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // ---- Fetch organization ------------------------------------------------
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!org) notFound();

  // ---- Fetch primary contact profile (first client in this org) ----------
  const { data: contact } = await supabase
    .from("profiles")
    .select("user_id, full_name, created_at")
    .eq("organization_id", org.id)
    .eq("role", "client")
    .limit(1)
    .maybeSingle();

  // ---- Fetch contact email from auth.users via admin API -----------------
  let contactEmail: string | null = null;
  if (contact?.user_id) {
    const { data: authData } = await supabase.auth.admin.getUserById(
      contact.user_id
    );
    contactEmail = authData.user?.email ?? null;
  }

  const createdDate = new Date(org.created_at).toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });

  // ---- Feature status placeholders ---------------------------------------
  // TODO: replace "Not started" with real status from assessment/metrics tables
  //       once those features are built.
  const features = [
    {
      label:       "Diagnostic Assessment",
      href:        "#",           // TODO: link to org-scoped assessment view
      status:      "Not started" as const,
      description: "Structured assessment of program maturity.",
    },
    {
      label:       "TrustQ Score",
      href:        "#",           // TODO: link to org-scoped score view
      status:      "Not started" as const,
      description: "Composite score calculated from the diagnostic assessment.",
    },
    {
      label:       "Metrics Dashboard",
      href:        "#",           // TODO: link to org-scoped metrics view
      status:      "Not started" as const,
      description: "KPIs across the investigations lifecycle.",
    },
    {
      label:       "Document Review",
      href:        "#",           // TODO: link to org-scoped document view
      status:      "Not started" as const,
      description: "Program policies, procedures, and supporting documentation.",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">

      {/* ---- Breadcrumb ---- */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:text-gray-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-600">{org.name}</span>
      </nav>

      {/* ---- Page header ---- */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">{org.name}</h1>
          <StatusBadge status={org.status} />
        </div>
        {/* Edit button — placeholder, no functionality yet */}
        {/* TODO: open an edit modal or navigate to /admin/organizations/[slug]/edit */}
        <button
          disabled
          title="Edit functionality coming soon"
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
        >
          Edit
        </button>
      </div>

      {/* ---- Detail cards row ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Primary contact */}
        <div className="rounded-xl bg-white border border-gray-200 px-5 py-4 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Primary contact
          </p>
          {contact ? (
            <>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {contact.full_name || "—"}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {contactEmail ?? "—"}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic mt-1">No contact assigned</p>
          )}
        </div>

        {/* TrustQ Score */}
        <div className="rounded-xl bg-white border border-gray-200 px-5 py-4 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            TrustQ Score
          </p>
          {org.health_score !== null ? (
            <p
              className={`text-3xl font-bold mt-1 ${
                org.health_score >= 75
                  ? "text-green-600"
                  : org.health_score >= 50
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
            >
              {org.health_score}
              <span className="text-base font-normal text-gray-400"> / 100</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic mt-1">Not yet scored</p>
          )}
          {/* TODO: show score date and trend once scoring engine is built */}
        </div>

        {/* Created date */}
        <div className="rounded-xl bg-white border border-gray-200 px-5 py-4 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Created
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{createdDate}</p>
          <p className="text-xs text-gray-400">/{org.slug}</p>
        </div>

      </div>

      {/* ---- Feature status cards ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-700">Program features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feat) => (
            <div
              key={feat.label}
              className="rounded-xl bg-white border border-gray-200 px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900">{feat.label}</p>
                <p className="text-xs text-gray-400">{feat.description}</p>
              </div>
              <StatusChip status={feat.status} />
            </div>
          ))}
        </div>
        {/* TODO: replace placeholder statuses with data from assessment / metrics tables */}
      </section>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit ${
        active
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-gray-400"}`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatusChip({ status }: { status: "Not started" }) {
  // TODO: add "In progress" and "Complete" variants when feature data is available
  return (
    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      {status}
    </span>
  );
}
