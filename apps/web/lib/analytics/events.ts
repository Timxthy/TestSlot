// Typed catalogue of product-analytics events (PRD §16 observability KPIs).
// Keeping the names in one place means every call site is type-checked and the
// dashboard event taxonomy can't drift from the code.
//
// Privacy rule: event properties carry IDs, slugs, counts and booleans only —
// NEVER email, postcode, notes, or anything from the never-collect list.

export type AnalyticsEvent =
  | "signup_completed"
  | "onboarding_completed"
  | "report_submitted"
  | "report_scam_blocked"
  | "report_rate_limited"
  | "cancellation_posted"
  | "cancellation_routed_to_moderation"
  | "centre_followed"
  | "centre_unfollowed"
  | "reminder_saved"
  | "account_exported"
  | "account_deleted";

/** Allowed property value shapes — deliberately narrow to keep PII out. */
export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

/** All known events, handy for tests and tooling. */
export const ANALYTICS_EVENTS: readonly AnalyticsEvent[] = [
  "signup_completed",
  "onboarding_completed",
  "report_submitted",
  "report_scam_blocked",
  "report_rate_limited",
  "cancellation_posted",
  "cancellation_routed_to_moderation",
  "centre_followed",
  "centre_unfollowed",
  "reminder_saved",
  "account_exported",
  "account_deleted",
];
