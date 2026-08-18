import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client (bypasses RLS, no user session).
 * Server-only — never expose to the browser. Used for cached public reads
 * and system tasks (e.g. notification lookups).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
