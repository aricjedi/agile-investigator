import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = { title: "Document Review" };

// ---------------------------------------------------------------------------
// /dashboard/documents — Document Review placeholder.
// TODO: Integrate Supabase Storage for secure file upload/download.
// TODO: Add document categorization (policy, procedure, training, etc.).
// TODO: Add reviewer assignment and annotation workflow.
// ---------------------------------------------------------------------------
export default function DocumentReviewPage() {
  return (
    <ComingSoonPage
      title="Document Review"
      description="Upload, organize, and share your program's policies, procedures, training materials, and supporting documentation for review."
      features={[
        "Secure document upload with org-scoped access",
        "Categorize documents by type and program area",
        "Reviewer assignment and status tracking",
        "Version history and change log",
      ]}
    />
  );
}
