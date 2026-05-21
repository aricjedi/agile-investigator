"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

// ---------------------------------------------------------------------------
// /auth/login — Email + password sign-in.
// After a successful login the user is routed based on their profile role:
//   admin   → /admin
//   client  → /dashboard
//   viewer  → /dashboard
// Wrong credentials surface a friendly error without exposing account details.
//
// TODO: add OAuth providers (Google, Microsoft) when SSO sprint begins.
// TODO: add "Forgot password" flow — call supabase.auth.resetPasswordForEmail().
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // ---- Authenticate ----
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Map Supabase error messages to user-friendly copy.
      const msg =
        signInError.message.toLowerCase().includes("invalid") ||
        signInError.message.toLowerCase().includes("credentials")
          ? "Incorrect email or password. Please try again."
          : signInError.message;
      setError(msg);
      setLoading(false);
      return;
    }

    // ---- Fetch role for redirect ----
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Authentication failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .single();

    // ---- Route by role ----
    if (profile?.role === "admin") {
      // Admins do not belong to an organization — route directly to the admin
      // console without any organization_id check.
      router.push("/admin");
    } else if (profile?.role === "client" || profile?.role === "viewer") {
      if (profile.organization_id) {
        router.push("/dashboard");
      } else {
        // Client account exists but has not been assigned to an organization yet.
        // TODO: redirect to an onboarding/pending-setup page once that route exists.
        setError(
          "Your account is not yet linked to an organization. Please contact your administrator."
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    } else {
      // No profile row found — account was created but never provisioned.
      // TODO: redirect to an onboarding/pending-setup page once that route exists.
      setError(
        "Your account is not yet linked to an organization. Please contact your administrator."
      );
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* ---- Brand header ---- */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandLogo href="/" size="lg" />
          <h1 className="text-2xl font-semibold text-gray-900">
            Sign in to your account
          </h1>
          <p className="text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-brand-600 hover:underline font-medium"
            >
              Sign up
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
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
              {/* TODO: link to password reset route once it exists */}
              <button
                type="button"
                className="text-xs text-brand-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* ---- Footer ---- */}
        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 TrustQ. Powered by Astris Integrity. All rights reserved.
        </p>
      </div>
    </main>
  );
}
