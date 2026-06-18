import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

const DAY_MS = 86_400_000;
const TRUSTED_SCORE = 70;

// Daily submission caps (PRD §25.5). New accounts are tighter than trusted ones.
export const RATE_CAPS = { reportNew: 5, reportTrusted: 30, cancellation: 3 };

type LimitedTable = "availability_reports" | "cancellation_posts";

/**
 * Abuse rail: caps how many rows a user can create per rolling 24h. Returns an
 * error message if over the cap, or null if allowed. No-ops in mock mode (no
 * service-role client) and fails OPEN on a count error so a transient DB hiccup
 * never blocks a legitimate submission.
 */
export async function checkRateLimit(userId: string, table: LimitedTable): Promise<string | null> {
  if (!SUPABASE_ENABLED) return null;

  const admin = getAdminClient();
  const sinceIso = new Date(Date.now() - DAY_MS).toISOString();

  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if (error) return null;

  let cap = RATE_CAPS.cancellation;
  if (table === "availability_reports") {
    const { data: profile } = await admin
      .from("profiles")
      .select("trust_score")
      .eq("id", userId)
      .maybeSingle();
    cap = (profile?.trust_score ?? 0) >= TRUSTED_SCORE ? RATE_CAPS.reportTrusted : RATE_CAPS.reportNew;
  }

  if ((count ?? 0) >= cap) {
    return `Daily limit reached (${cap}). Please try again tomorrow.`;
  }
  return null;
}
