// Analytics/observability configuration. All values are optional — the whole
// stack is inert until the relevant keys are set, mirroring the Supabase and
// Resend "configured?" gates elsewhere in the app.
//
// PostHog is hosted in the EU region by default (PRD §3: PostHog(EU)). Override
// NEXT_PUBLIC_POSTHOG_HOST for self-hosted or US-region projects.

/** Publishable PostHog project key — safe in the browser by design. */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";

/** PostHog ingestion host. Defaults to the EU cloud region. */
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

/** Optional Sentry browser DSN. Inert (no SDK loaded) until set. */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

/** True when browser analytics has a destination configured. */
export const ANALYTICS_ENABLED = Boolean(POSTHOG_KEY);

/** True when browser error reporting has a destination configured. */
export const SENTRY_ENABLED = Boolean(SENTRY_DSN);
