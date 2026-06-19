import { trustLevelFromScore, type TrustLevel } from "@testslot/shared";
import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

/**
 * The user's current trust level, derived from their stored score (never the raw
 * number). Used to gate auto-publish vs moderation on the report write path.
 * Defaults to "normal" in mock mode / on any read error so submissions aren't
 * wrongly blocked.
 */
export async function getUserTrustLevel(userId: string): Promise<TrustLevel> {
  if (!SUPABASE_ENABLED) return "normal";
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select("trust_score")
    .eq("id", userId)
    .maybeSingle();
  if (error) return "normal";
  return trustLevelFromScore(data?.trust_score ?? 50);
}
