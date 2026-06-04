"use client";

// ---------------------------------------------------------------------------
// OrgProfileForm — captures the Organization Profile that drives all
// per-dimension risk-adjusted targets.
//
// "Input once, drives everything." The six fields below determine the target
// score for each of the nine TrustQ dimensions.  The form pre-populates if
// a profile already exists (editing scenario).
//
// On submit it calls saveOrgProfile() server action, then navigates to the
// diagnostic assessment.
// ---------------------------------------------------------------------------

import { useState }   from "react";
import { useRouter }  from "next/navigation";
import { saveOrgProfile } from "@/app/dashboard/assessment/actions";
import type {
  Headcount, GeographicScope, ConsequenceSeverity, CaseVolume,
} from "@/types/database";

interface OrgProfileFormProps {
  assessmentId:   string;
  organizationId: string;
  /** Pre-populated values if editing an existing profile */
  existing?: {
    headcount:            Headcount;
    geographic_scope:     GeographicScope;
    consequence_severity: ConsequenceSeverity;
    regulated:            boolean;
    case_volume:          CaseVolume;
    industry:             string | null;
  };
}

export function OrgProfileForm({
  assessmentId,
  organizationId,
  existing,
}: OrgProfileFormProps) {
  const router = useRouter();

  const [headcount,   setHeadcount]   = useState<Headcount | "">(existing?.headcount ?? "");
  const [geoScope,    setGeoScope]    = useState<GeographicScope | "">(existing?.geographic_scope ?? "");
  const [consequence, setConsequence] = useState<ConsequenceSeverity | "">(existing?.consequence_severity ?? "");
  const [regulated,   setRegulated]   = useState<boolean>(existing?.regulated ?? false);
  const [caseVolume,  setCaseVolume]  = useState<CaseVolume | "">(existing?.case_volume ?? "");
  const [industry,    setIndustry]    = useState(existing?.industry ?? "");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const isComplete = headcount && geoScope && consequence && caseVolume;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveOrgProfile({
        organizationId,
        assessmentId,
        headcount:           headcount as Headcount,
        geographicScope:     geoScope  as GeographicScope,
        consequenceSeverity: consequence as ConsequenceSeverity,
        regulated,
        caseVolume:          caseVolume as CaseVolume,
        industry:            industry.trim() || null,
      });
      router.push(`/dashboard/assessment/${assessmentId}`);
      router.refresh();
    } catch {
      setError("Could not save profile. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-2xl">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">
          Step 1 of 2
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">
          Organization Profile
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          TrustQ scores your program against risk-adjusted targets — not a
          one-size-fits-all standard. These six inputs determine what a
          well-matched program looks like for your organization.
          Answer once; the profile drives all nine dimension targets.
        </p>
      </div>

      {/* ---- Headcount ---- */}
      <FieldGroup
        label="Organization size"
        hint="Total employee headcount globally."
      >
        <RadioGroup
          name="headcount"
          value={headcount}
          onChange={(v) => setHeadcount(v as Headcount)}
          options={[
            { value: "small", label: "Small",  description: "Under 1,000 employees" },
            { value: "mid",   label: "Mid",    description: "1,000 – 10,000 employees" },
            { value: "large", label: "Large",  description: "Over 10,000 employees" },
          ]}
        />
      </FieldGroup>

      {/* ---- Geographic scope ---- */}
      <FieldGroup
        label="Geographic footprint"
        hint="Where your investigations function operates."
      >
        <RadioGroup
          name="geo"
          value={geoScope}
          onChange={(v) => setGeoScope(v as GeographicScope)}
          options={[
            { value: "single", label: "Single jurisdiction",      description: "All employees and operations in one country" },
            { value: "multi",  label: "Multi-jurisdiction",       description: "Operations or employees in more than one country" },
          ]}
        />
      </FieldGroup>

      {/* ---- Consequence severity ---- */}
      <FieldGroup
        label="Consequence severity"
        hint="Characterize the typical stakes of your case mix — consider subject seniority, case complexity, and downstream legal/regulatory exposure."
      >
        <RadioGroup
          name="consequence"
          value={consequence}
          onChange={(v) => setConsequence(v as ConsequenceSeverity)}
          options={[
            { value: "low",      label: "Low",      description: "Primarily lower-level conduct matters; limited legal or regulatory exposure" },
            { value: "moderate", label: "Moderate", description: "Mix of conduct types; some regulatory or litigation risk in the case portfolio" },
            { value: "high",     label: "High",     description: "Regular exposure to senior subjects, significant regulatory risk, or high-stakes litigation" },
          ]}
        />
      </FieldGroup>

      {/* ---- Regulated ---- */}
      <FieldGroup
        label="Regulated industry"
        hint="Does your organization operate under external regulatory oversight that creates specific investigation-related obligations (e.g., FDA, SEC, FCPA, NHS, financial services regulators)?"
      >
        <div className="flex gap-3">
          {[
            { value: true,  label: "Yes — regulated" },
            { value: false, label: "No — unregulated" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setRegulated(opt.value)}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-all ${
                regulated === opt.value
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-700 hover:border-brand-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* ---- Case volume ---- */}
      <FieldGroup
        label="Case volume"
        hint="Average annual volume of investigations your function handles."
      >
        <RadioGroup
          name="volume"
          value={caseVolume}
          onChange={(v) => setCaseVolume(v as CaseVolume)}
          options={[
            { value: "low",      label: "Low",      description: "Fewer than 25 cases per year" },
            { value: "moderate", label: "Moderate", description: "25 – 150 cases per year" },
            { value: "high",     label: "High",     description: "More than 150 cases per year" },
          ]}
        />
      </FieldGroup>

      {/* ---- Industry (optional) ---- */}
      <FieldGroup
        label="Industry (optional)"
        hint="Used for future benchmarking and sourced risk weighting. NAICS code or plain label (e.g., Pharmaceutical, Financial Services, Healthcare)."
      >
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g., Pharmaceutical Manufacturing"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </FieldGroup>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          You can update this profile at any time before submitting.
        </p>
        <button
          type="submit"
          disabled={!isComplete || saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Continue to Assessment →"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// FieldGroup
// ---------------------------------------------------------------------------
function FieldGroup({
  label,
  hint,
  children,
}: {
  label:    string;
  hint:     string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{hint}</p>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RadioGroup
// ---------------------------------------------------------------------------
function RadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name:     string;
  value:    string;
  onChange: (v: string) => void;
  options:  { value: string; label: string; description: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
            value === opt.value
              ? "border-brand-600 bg-brand-50"
              : "border-gray-200 hover:border-brand-300"
          }`}
        >
          <span className={`text-sm font-semibold ${value === opt.value ? "text-brand-700" : "text-gray-800"}`}>
            {opt.label}
          </span>
          <span className={`block text-xs mt-0.5 ${value === opt.value ? "text-brand-500" : "text-gray-500"}`}>
            {opt.description}
          </span>
        </button>
      ))}
    </div>
  );
}
