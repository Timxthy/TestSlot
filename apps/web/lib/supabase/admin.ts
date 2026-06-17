import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Service-role client (bypasses RLS). Server-only — used for the Auth Admin API
 * (instant-confirm signup) and trusted writes like creating the profile row.
 * Never import this into client components.
 */
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
