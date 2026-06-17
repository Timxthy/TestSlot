// Server-only Supabase configuration. Centralises the all-or-nothing decision
// between mock mode and live mode, and fails fast on partial configuration.

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const present = [url, anonKey, serviceKey].filter(Boolean).length;

if (present > 0 && present < 3) {
  throw new Error(
    "Partial Supabase configuration. Set SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "and SUPABASE_SERVICE_ROLE_KEY together, or none of them (mock mode).",
  );
}

/** True only when all three Supabase vars are present. */
export const SUPABASE_ENABLED = present === 3;

/** Returns the validated env, or throws if Supabase isn't fully configured. */
export function supabaseEnv(): { url: string; anonKey: string; serviceKey: string } {
  if (!SUPABASE_ENABLED) {
    throw new Error("Supabase is not configured (running in mock mode).");
  }
  return { url, anonKey, serviceKey };
}
