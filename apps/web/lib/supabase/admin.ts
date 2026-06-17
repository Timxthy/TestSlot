import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./config";

let cached: SupabaseClient | null = null;

/**
 * Lazily-created service-role client (bypasses RLS). Created on first use rather
 * than at import time, and throws if Supabase isn't configured. Server-only —
 * never import into a client component.
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const { url, serviceKey } = supabaseEnv();
  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
