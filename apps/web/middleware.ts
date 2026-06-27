import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { authRedirect } from "@/lib/auth-routing";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function middleware(request: NextRequest) {
  // Mock mode (no Supabase configured): do nothing. The demo user makes everyone
  // "signed in" in mock mode, so auth-aware redirects must stay live-mode only.
  if (!url || !anon) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the auth token and keeps cookies in sync.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Send signed-in users away from guest-only pages (e.g. the marketing landing,
  // login, signup) and into the app.
  const destination = authRedirect(request.nextUrl.pathname, Boolean(user));
  if (destination) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Carry over any refreshed auth cookies so the session stays in sync.
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
