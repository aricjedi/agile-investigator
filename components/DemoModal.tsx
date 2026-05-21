"use client";

import { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// DemoModal — "Request demo" button + modal for the landing page.
// No backend yet; submit closes the modal after a brief thank-you state.
// TODO: wire submit to a CRM / HubSpot form endpoint in the marketing sprint.
// ---------------------------------------------------------------------------
export function DemoModal() {
  const [open, setOpen]           = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const firstFieldRef             = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Focus first field when modal opens
  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  function openModal()  { setOpen(true); setSubmitted(false); }
  function close()      { setOpen(false); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    // No backend yet — auto-close after the thank-you message
    setTimeout(close, 1800);
  }

  return (
    <>
      {/* Trigger button — exact same visual style as the original */}
      <button
        onClick={openModal}
        className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Request demo
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop — click outside to close */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-5">

            {/* X close button */}
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div>
              <h2
                id="demo-modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                Request a demo
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Interested in a TrustQ demo? We&apos;ll be in touch.
              </p>
            </div>

            {/* Body — form or thank-you */}
            {submitted ? (
              <div className="py-6 flex flex-col items-center gap-3 text-center">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-gray-800">Thanks — we&apos;ll be in touch shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field
                  id="demo-name"
                  label="Full name"
                  placeholder="Jane Smith"
                  required
                  ref={firstFieldRef}
                />
                <Field
                  id="demo-org"
                  label="Organization"
                  placeholder="Acme Corporation"
                  required
                />
                <Field
                  id="demo-email"
                  label="Work email"
                  type="email"
                  placeholder="jane@acme.com"
                  required
                />
                <button
                  type="submit"
                  className="mt-1 w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  Submit request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Field helper
// ---------------------------------------------------------------------------
const Field = ({
  id,
  label,
  type = "text",
  placeholder,
  required,
  ref,
}: {
  id:           string;
  label:        string;
  type?:        string;
  placeholder?: string;
  required?:    boolean;
  ref?:         React.Ref<HTMLInputElement>;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      ref={ref}
      id={id}
      name={id}
      type={type}
      placeholder={placeholder}
      required={required}
      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
    />
  </div>
);
