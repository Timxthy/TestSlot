import type { DataStore } from "./store";
import { mockStore } from "./mock-store";
import { createSupabaseStore } from "./supabase-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

/**
 * Session-scoped store — reads/writes go through the signed-in user's JWT, so
 * Row-Level Security is enforced. Use for user WRITES (reports, follows,
 * cancellations) so a user can only act as themselves.
 */
export function getStore(): DataStore {
  if (!SUPABASE_ENABLED) return mockStore;
  return createSupabaseStore(createSupabaseServerClient());
}

/**
 * Trusted server store (service role, bypasses RLS). Use for aggregate READS
 * (status/heatmap/feed) — which must never be exposed to clients as raw rows —
 * and, ONLY after an explicit role check, for moderation. Never call this for an
 * unauthenticated/unauthorised request.
 */
export function getServiceStore(): DataStore {
  if (!SUPABASE_ENABLED) return mockStore;
  return createSupabaseStore(getAdminClient());
}

export type { DataStore } from "./store";
