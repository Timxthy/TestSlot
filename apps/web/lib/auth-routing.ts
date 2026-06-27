// Pure auth-aware routing rules, shared by the middleware (live mode) and unit
// tests. Kept free of Next/Supabase imports so the decision is trivially testable.

/**
 * Guest-only routes: a signed-in user has no reason to see these, so we bounce
 * them into the app. "/" is the marketing landing — once you're logged in,
 * "home" is the dashboard.
 */
export const GUEST_ONLY_PATHS = new Set(["/", "/login", "/signup"]);

/** Where signed-in users are sent from a guest-only route. */
export const APP_HOME = "/dashboard";

/**
 * Decides where (if anywhere) to redirect for the given path + auth state.
 * Returns a destination path, or null to let the request proceed.
 *
 * Only handles the "signed-in user on a guest-only page" case. Protection of the
 * authed app routes themselves stays in requireUser() at the layout/page level
 * (which also covers mock mode), so it isn't duplicated here.
 */
export function authRedirect(
  pathname: string,
  isAuthed: boolean,
): string | null {
  if (isAuthed && GUEST_ONLY_PATHS.has(pathname)) return APP_HOME;
  return null;
}
