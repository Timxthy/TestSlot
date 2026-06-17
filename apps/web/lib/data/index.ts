import type { DataStore } from "./store";
import { mockStore } from "./mock-store";
import { createSupabaseStore } from "./supabase-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Session-scoped store: reads/writes go through the signed-in user's JWT, so
 * Postgres Row-Level Security is enforced. Use for all user-facing work.
 * Falls back to the seeded mock store when Supabase isn't configured.
 */
export function getStore(): DataStore {
  if (!useSupabase) return mockStore;
  return createSupabaseStore(createSupabaseServerClient());
}

/**
 * Service-role store (bypasses RLS). Use ONLY for moderation/admin and trusted
 * system tasks — never for ordinary user requests.
 */
export function getAdminStore(): DataStore {
  if (!useSupabase) return mockStore;
  return createSupabaseStore(supabaseAdmin);
}

export type { DataStore } from "./store";
