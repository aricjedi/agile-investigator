import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoModal } from "@/components/DemoModal";

// ---------------------------------------------------------------------------
// / — Landing page shell.
// TODO: hero section, feature highlights, pricing, CTA
// TODO: add demo booking link (Calendly or HubSpot)
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* ---- Navigation ---- */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <BrandLogo href="/" size="md" />
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ---- Hero shell ---- */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Corporate Investigations,{" "}
          <span className="text-brand-600">Simplified.</span>
        </h1>
        <p className="max-w-xl text-lg text-gray-500">
          TrustQ gives compliance and ethics leaders a real-time health dashboard
          for their investigations program — from intake to resolution.
        </p>

        <div className="flex gap-3 mt-2">
          <Link
            href="/auth/signup"
            className="rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Start free trial
          </Link>
          <DemoModal />
        </div>
      </section>

      {/* ---- Feature placeholders ---- */}
      {/* TODO: add feature grid, testimonials, pricing table */}

      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
        © 2026 TrustQ. Powered by Astris Integrity. All rights reserved.
      </footer>
    </main>
  );
}
