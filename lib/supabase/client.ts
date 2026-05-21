import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Browser-side Supabase client — safe to use in Client Components.
// Reads cookies automatically via @supabase/ssr.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
