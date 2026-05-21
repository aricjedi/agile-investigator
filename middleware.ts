import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import type { UserRole } from "@/types/database";

// ---------------------------------------------------------------------------
// Route access rules
// ---------------------------------------------------------------------------
const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/admin":     ["admin"],
  "/dashboard": ["client", "viewer"],
};

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = await createMiddlewareClient(request);
  const pathname = request.nextUrl.pathname;

  // Refresh the session on every request (keeps tokens fresh).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- Unauthenticated users ------------------------------------------------
  const protectedPrefixes = Object.keys(ROUTE_ROLES);
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---- Authenticated users: enforce role ------------------------------------
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;

    const matchedPrefix = protectedPrefixes.find((p) =>
      pathname.startsWith(p)
    )!;
    const allowedRoles = ROUTE_ROLES[matchedPrefix];

    if (!role || !allowedRoles.includes(role)) {
      // Redirect to the section the user's role does belong to, or home.
      const fallback =
        role === "admin" ? "/admin" : role ? "/dashboard" : "/";
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  // ---- Redirect logged-in users away from auth pages -----------------------
  if (user && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup"))) {
    // TODO: after onboarding flow is added, redirect new users there instead
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
