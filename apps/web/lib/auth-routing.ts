// Pure auth-aware routing rules, shared by the middleware (live mode) and unit
// tests. Kept free of Next/Supabase imports so the decisions are trivially
// testable.

/**
 * Guest-only routes: a signed-in user has no reason to see these, so we bounce
 * them into the app. "/" is the marketing landing — once you're logged in,
 * "home" is the dashboard.
 */
export const GUEST_ONLY_PATHS = new Set(["/", "/login", "/signup"]);

/** Authed-only page route prefixes. A signed-out visitor is sent to /login. */
export const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/report",
  "/cancellations",
  "/settings",
  "/notifications",
  "/centres",
  "/admin",
  "/onboarding",
];

/** Where signed-in users are sent from a guest-only route. */
export const APP_HOME = "/dashboard";

/** True for an authed-only page route (exact match or nested path). */
export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Validates a `next` destination is a same-site absolute path, guarding against
 * open redirects (protocol-relative `//evil.com` or absolute URLs). Returns the
 * path, or null if unsafe/absent.
 */
export function safeInternalPath(path: string | undefined | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/**
 * Decides where (if anywhere) to redirect for the given path + auth state.
 * Returns a destination path, or null to let the request proceed.
 *
 * - Signed-in user on a guest-only page → the app.
 * - Signed-out user on an authed-only page → login, remembering where they were
 *   headed via `?next=` so they land there after signing in.
 */
export function authRedirect(
  pathname: string,
  isAuthed: boolean,
  search = "",
): string | null {
  if (isAuthed && GUEST_ONLY_PATHS.has(pathname)) return APP_HOME;
  if (!isAuthed && isAppRoute(pathname)) {
    const destination = search ? `${pathname}?${search}` : pathname;
    return `/login?next=${encodeURIComponent(destination)}`;
  }
  return null;
}
