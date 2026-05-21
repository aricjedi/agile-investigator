import Link from "next/link";
import type { Metadata } from "next";
import { CreateOrgForm } from "@/components/admin/CreateOrgForm";

export const metadata: Metadata = {
  title: "New Organization | TrustQ Admin",
};

// ---------------------------------------------------------------------------
// /admin/organizations/new — create a new client organization.
// Server Component wrapper; the interactive form lives in CreateOrgForm.
// ---------------------------------------------------------------------------
export default function NewOrganizationPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:text-gray-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-600">New Organization</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Create organization
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Provisions a new client organization and creates the primary contact&apos;s
          account. No email is sent at this stage.
        </p>
      </div>

      <CreateOrgForm />
    </div>
  );
}
