"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Heuristic session check: @supabase/ssr stores the session in JS-readable
// `sb-*` cookies (the browser client reads them the same way). This lets the
// marketing header adapt for signed-in users WITHOUT making the (statically
// generated, SEO-critical) marketing pages render dynamically. Worst case — if
// the cookie isn't visible — it simply shows the signed-out call to action.
function hasSession(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("sb-"));
}

/** Header call-to-action that adapts to whether the visitor is signed in. */
export function HeaderCta() {
  const [authed, setAuthed] = useState(false);

  // Runs after hydration, so the server render matches the signed-out markup
  // (no hydration mismatch) and then upgrades for signed-in users.
  useEffect(() => setAuthed(hasSession()), []);

  if (authed) {
    return (
      <Link href="/dashboard" className="btn-primary !px-4 !py-2 text-sm">
        Go to dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/dashboard"
        className="hidden text-sm font-medium text-slate-600 transition hover:text-ink sm:inline"
      >
        Open app
      </Link>
      <Link href="/#waitlist" className="btn-primary !px-4 !py-2 text-sm">
        Join the beta
      </Link>
    </>
  );
}
