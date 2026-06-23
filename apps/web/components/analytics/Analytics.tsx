"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ANALYTICS_CONFIGURED, POSTHOG_KEY } from "@/lib/analytics/config";
import {
  CONSENT_CHANGE_EVENT,
  shouldLoadAnalytics,
  type ConsentChoice,
} from "@/lib/analytics/consent";
import {
  capturePageview,
  getStoredConsent,
  loadPostHog,
  loadSentry,
  optOut,
  storeConsent,
} from "@/lib/analytics/client";
import { CookieConsent } from "./CookieConsent";

/**
 * Single mount point for browser analytics + cookie consent. Wholly inert when
 * NEXT_PUBLIC_POSTHOG_KEY is unset: no banner, no cookies, no script. When a key
 * is set, PostHog loads only after the user grants consent.
 */
export function Analytics() {
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read the persisted choice after mount (avoids SSR/CSR cookie mismatch).
  useEffect(() => {
    setConsent(getStoredConsent());
    setHydrated(true);
  }, []);

  // On consent, load each configured destination (each self-gates on its key).
  useEffect(() => {
    if (consent !== "granted") return;
    loadPostHog();
    loadSentry();
  }, [consent]);

  // The footer "Cookie settings" control fires this to re-prompt for consent.
  useEffect(() => {
    const reopen = () => setConsent(null);
    window.addEventListener(CONSENT_CHANGE_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, reopen);
  }, []);

  const accept = useCallback(() => {
    storeConsent("granted");
    setConsent("granted");
  }, []);

  const decline = useCallback(() => {
    storeConsent("denied");
    setConsent("denied");
    optOut();
  }, []);

  if (!ANALYTICS_CONFIGURED) return null;

  return (
    <>
      {shouldLoadAnalytics(POSTHOG_KEY, consent) ? (
        <Suspense fallback={null}>
          <PageviewTracker />
        </Suspense>
      ) : null}
      {hydrated && consent === null ? (
        <CookieConsent onAccept={accept} onDecline={decline} />
      ) : null}
    </>
  );
}

/** Sends a manual pageview on every client-side navigation. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = searchParams?.toString();
    capturePageview(
      `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`,
    );
  }, [pathname, searchParams]);

  return null;
}
