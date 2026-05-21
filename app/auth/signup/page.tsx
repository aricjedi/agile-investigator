"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

// ---------------------------------------------------------------------------
// /auth/signup — New user self-registration.
// After Supabase sends a confirmation email the user is shown a success state.
// TODO: invite-only mode — validate invite token before allowing signup.
// TODO: collect organization name here once org self-provisioning is designed.
// ---------------------------------------------------------------------------
export default function SignupPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // TODO: change redirect to /auth/confirm once that route exists.
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6 bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <BrandLogo href="/" size="lg" />
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a confirmation link to{" "}
              <strong className="text-gray-700">{email}</strong>. Click it to
              activate your account, then sign in.
            </p>
          </div>
          <Link href="/auth/login" className="text-sm text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </div>
        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 TrustQ. Powered by Astris Integrity. All rights reserved.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* ---- Brand header ---- */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandLogo href="/" size="lg" />
          <h1 className="text-2xl font-semibold text-gray-900">
            Create your account
          </h1>
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* ---- Form ---- */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col gap-5"
        >
          {error && (
            <div
              role="alert"
              className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Jane Smith"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            By signing up you agree to our{" "}
            {/* TODO: link to Terms of Service and Privacy Policy pages */}
            <span className="underline cursor-pointer">Terms of Service</span> and{" "}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 TrustQ. Powered by Astris Integrity. All rights reserved.
        </p>
      </div>
    </main>
  );
}
