"use client";

import { useEffect } from "react";
import { POSTHOG_KEY } from "@/lib/analytics/config";
import { identify } from "@/lib/analytics/client";

/**
 * Identifies the signed-in user to PostHog (by UUID) so their browser events
 * stitch with the server-side events captured under the same id. No-ops until
 * analytics is configured and the user has consented (identify() holds the id
 * until PostHog loads).
 */
export function AnalyticsIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    if (!POSTHOG_KEY || !userId) return;
    identify(userId);
  }, [userId]);

  return null;
}
