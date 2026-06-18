// Server-only Supabase configuration. Decides between mock mode and live mode.
//
// Live mode is gated on the SERVER-side secret + URL (read at runtime; in hosting
// these are scoped to production only). We deliberately do NOT gate on the
// NEXT_PUBLIC_* vars: Next inlines those at build time, so gating on them ties the
// live/mock decision to build-time env availability and can crash the build (or
// wrongly flip at runtime). This keeps deploy previews (no secrets) cleanly in
// mock mode and never fails the build on a partial/build-time-only env.
//
// Note: `||` (not `??`) so an empty-string env var falls through to the fallback.

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Live mode: the server URL + service-role secret are both present. */
export const SUPABASE_ENABLED = Boolean(url && serviceKey);

/**
 * Returns the validated env, or throws. In live mode, throws a clear error if the
 * publishable anon key is missing — it must be a NON-secret variable so that Next
 * can inline it at build time (it is safe in the browser by design).
 */
export function supabaseEnv(): { url: string; anonKey: string; serviceKey: string } {
  if (!SUPABASE_ENABLED) {
    throw new Error("Supabase is not configured (running in mock mode).");
  }
  if (!anonKey) {
    throw new Error(
      "Supabase is enabled (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set) but " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing/empty. Set it as a NON-secret " +
        "variable so it is available at build time.",
    );
  }
  return { url, anonKey, serviceKey };
}
