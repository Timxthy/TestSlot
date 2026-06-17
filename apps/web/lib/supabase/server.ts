import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseEnv } from "./config";

/**
 * Server-side Supabase client bound to the request cookies (the user's session).
 * Only call when Supabase is configured (guarded by SUPABASE_ENABLED upstream).
 */
export function createSupabaseServerClient() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — the middleware refreshes cookies.
        }
      },
    },
  });
}
