"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { POSTHOG_KEY } from "@/lib/analytics/config";
import {
  CONSENT_CHANGE_EVENT,
  shouldLoadAnalytics,
  shouldShowConsentBanner,
  type ConsentChoice,
} from "@/lib/analytics/consent";
import {
  capturePageview,
  getStoredConsent,
  loadPostHog,
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

  useEffect(() => {
    if (shouldLoadAnalytics(POSTHOG_KEY, consent)) loadPostHog();
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

  if (!POSTHOG_KEY) return null;

  return (
    <>
      {shouldLoadAnalytics(POSTHOG_KEY, consent) ? (
        <Suspense fallback={null}>
          <PageviewTracker />
        </Suspense>
      ) : null}
      {hydrated && shouldShowConsentBanner(POSTHOG_KEY, consent) ? (
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
