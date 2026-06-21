// Server-side product analytics over the PostHog capture API — no SDK
// dependency (mirrors lib/email/resend.ts). Inert until POSTHOG_KEY is set, so
// it is a safe no-op in mock/dev and in any deploy without analytics configured.
//
// This path does NOT set browser cookies and is governed by legitimate-interest
// first-party product metrics, distinct from the cookie-consented browser
// analytics. It carries the user UUID as the distinct id and nothing else that
// could identify a person — never email, postcode or report contents.
//
// Docs: https://posthog.com/docs/api/capture

import type { AnalyticsEvent, AnalyticsProps } from "./events";

function key(): string {
  return process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
}

function host(): string {
  const h =
    process.env.POSTHOG_HOST ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    "https://eu.i.posthog.com";
  return h.replace(/\/+$/, "");
}

/** True once a PostHog key is configured for server-side capture. */
export function isServerAnalyticsConfigured(): boolean {
  return Boolean(key());
}

/**
 * Records a product event. Best-effort and never throws: observability must not
 * break a user action. `distinctId` should be the user's UUID (or a stable
 * pseudonymous id) — never an email address.
 */
export async function captureServer(
  event: AnalyticsEvent,
  distinctId: string,
  properties: AnalyticsProps = {},
): Promise<void> {
  const apiKey = key();
  if (!apiKey) return;

  try {
    await fetch(`${host()}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId || "anonymous",
        properties: { ...properties, $lib: "testslot-server" },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    /* best-effort — swallow network/transport errors */
  }
}
