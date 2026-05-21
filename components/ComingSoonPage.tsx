// ---------------------------------------------------------------------------
// ComingSoonPage — shared placeholder for dashboard feature routes that are
// not yet built. Each feature page passes its own title, description, and a
// list of upcoming capabilities so the client has a clear sense of what to
// expect. Replace this component with real content in the relevant sprint.
// ---------------------------------------------------------------------------

interface ComingSoonPageProps {
  title:       string;
  description: string;
  /** Short capability bullets shown as a preview of the upcoming feature */
  features:    string[];
}

export function ComingSoonPage({ title, description, features }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Coming soon
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500 max-w-2xl">{description}</p>
      </div>

      {/* Preview card */}
      <div className="rounded-xl bg-white border border-dashed border-gray-300 px-8 py-12 flex flex-col items-center gap-6 text-center max-w-xl">
        {/* Placeholder illustration */}
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-brand-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
            />
          </svg>
        </div>

        <div>
          <p className="font-semibold text-gray-700">In development</p>
          <p className="mt-1 text-sm text-gray-400">
            This feature is actively being built and will be available soon.
            Your Astris Integrity team will notify you when it&apos;s ready.
          </p>
        </div>

        {/* Upcoming features list */}
        <ul className="text-left w-full space-y-2">
          {features.map((feat, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-500">
              <svg
                className="w-4 h-4 mt-0.5 text-brand-300 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feat}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
