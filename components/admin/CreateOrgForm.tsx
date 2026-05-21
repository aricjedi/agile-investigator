"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganization, type CreateOrgResult } from "@/app/admin/organizations/actions";

// ---------------------------------------------------------------------------
// CreateOrgForm — drives the new-organization form.
// On success it shows a credential card instead of redirecting, so the admin
// can copy and share the login details with the client before navigating away.
//
// TODO: add org plan/tier selector when billing sprint begins.
// TODO: add field for primary contact phone number.
// ---------------------------------------------------------------------------
export function CreateOrgForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]           = useState<string | null>(null);
  const [created, setCreated]       = useState<Extract<CreateOrgResult, { success: true }> | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createOrganization(null, formData);
      if (result.success) {
        setCreated(result);
      } else {
        setError(result.error);
      }
    });
  }

  // ---- Success: show credentials ----------------------------------------
  if (created) {
    const { orgName, credentials } = created;
    return (
      <div className="flex flex-col gap-5">
        {/* Banner */}
        <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-green-800">
              Organization created successfully
            </p>
            <p className="text-sm text-green-700 mt-0.5">
              Share the credentials below with <strong>{credentials.contactName}</strong> so
              they can log in to the TrustQ client portal.
            </p>
          </div>
        </div>

        {/* Credentials card */}
        <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
          <div className="px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Client login credentials
            </p>
            <dl className="flex flex-col gap-3">
              <CredRow label="Organization"   value={orgName} />
              <CredRow label="Contact name"   value={credentials.contactName} />
              <CredRow label="Email"          value={credentials.email} copyable />
              <CredRow label="Temp password"  value={credentials.password} copyable masked />
            </dl>
          </div>
          <div className="px-6 py-3 bg-amber-50 rounded-b-xl">
            <p className="text-xs text-amber-700">
              <strong>Important:</strong> this password is shown once. The client should
              change it immediately after first login.
              {/* TODO: replace with invite-email flow once email sprint ships */}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => { setCreated(null); }}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Create another
          </button>
          <button
            onClick={() => { router.push("/admin"); router.refresh(); }}
            className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Go to admin dashboard
          </button>
        </div>
      </div>
    );
  }

  // ---- Form --------------------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100"
    >
      {/* Error banner */}
      {error && (
        <div className="px-6 py-4 rounded-t-xl text-sm bg-red-50 border-b border-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* Organization details */}
      <fieldset className="px-6 py-5 flex flex-col gap-5" disabled={isPending}>
        <legend className="text-sm font-semibold text-gray-700 mb-1">
          Organization details
        </legend>
        <Field
          id="name"
          label="Organization name"
          placeholder="Acme Corporation"
          required
          autoComplete="organization"
        />
      </fieldset>

      {/* Primary contact */}
      <fieldset className="px-6 py-5 flex flex-col gap-5" disabled={isPending}>
        <legend className="text-sm font-semibold text-gray-700 mb-1">
          Primary contact
          <span className="ml-1 font-normal text-gray-400">
            — this person will be the client-portal user
          </span>
        </legend>
        <Field
          id="contactName"
          label="Full name"
          placeholder="Jane Smith"
          required
          autoComplete="name"
        />
        <Field
          id="contactEmail"
          label="Work email"
          type="email"
          placeholder="jane@acme.com"
          required
          autoComplete="email"
        />
        <p className="text-xs text-gray-400">
          A login account will be created with a temporary password displayed
          after submission.
          {/* TODO: replace with invite-email trigger once email sprint ships */}
        </p>
      </fieldset>

      {/* Actions */}
      <div className="px-6 py-4 flex items-center justify-end gap-3 bg-gray-50 rounded-b-xl">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors min-w-[160px]"
        >
          {isPending ? "Creating…" : "Create organization"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// CredRow — displays one credential field with optional copy button
// ---------------------------------------------------------------------------
function CredRow({
  label,
  value,
  copyable = false,
  masked   = false,
}: {
  label:     string;
  value:     string;
  copyable?: boolean;
  masked?:   boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [show, setShow]     = useState(!masked);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs font-medium text-gray-500 w-32 shrink-0">{label}</dt>
      <dd className="flex items-center gap-2 min-w-0 flex-1">
        <code className="text-sm font-mono text-gray-900 bg-gray-50 rounded px-2 py-0.5 truncate flex-1">
          {show ? value : "•".repeat(value.length)}
        </code>
        {masked && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-brand-600 hover:text-brand-800 shrink-0 font-medium"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field helper
// ---------------------------------------------------------------------------
function Field({
  id,
  label,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  id:            string;
  label:         string;
  type?:         string;
  placeholder?:  string;
  required?:     boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}
