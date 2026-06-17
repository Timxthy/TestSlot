import bannedPhrases from "./banned-phrases.json";

/**
 * The five guarantees shown in the trust strip. The whole product positioning
 * lives or dies on these (PRD §6, §32).
 */
export const TRUST_STRIP = [
  "No DVSA login",
  "No licence number",
  "No theory pass number",
  "No auto-booking",
  "No scanning",
] as const;

/** Persistent legal boundary shown in the footer and on key pages (PRD §6.4). */
export const LEGAL_DISCLAIMER =
  "TestSlot Radar is not affiliated with DVSA, DVLA or GOV.UK. You must book, change, cancel or swap your own driving test through GOV.UK.";

/** Repeated near every call-to-action (PRD §6.3). */
export const SAFETY_MESSAGE =
  "Never share your driving licence number, theory pass number, booking reference or GOV.UK login with anyone — and never pay anyone for a driving test slot.";

/** Label that must accompany any availability/status data (PRD §13.3). */
export const COMMUNITY_DATA_LABEL =
  "Based on community reports, not live DVSA data.";

/**
 * Official GOV.UK entry point learners use to check/manage their own test.
 * Overridable in the web app via NEXT_PUBLIC_GOVUK_BOOKING_URL.
 */
export const GOVUK_BOOKING_URL = "https://www.gov.uk/book-driving-test";

/**
 * Examples of what scammers say, shown on the safety page so learners can
 * recognise them. These live here (data) rather than inline in page source so
 * the compliance lint never mistakes an educational example for a claim we make.
 */
export const SCAM_WARNING_SIGNS = [
  "“I can get you a guaranteed earlier test”",
  "“Pay a deposit and I’ll book it for you”",
  "“Send me your licence number and booking reference”",
  "“£30 and I’ll swap your test”",
  "“DM or WhatsApp me to buy a slot”",
] as const;

/** Things learners should never share or do (PRD §6.3, §13.7). */
export const NEVER_SHARE = [
  "Your driving licence number",
  "Your theory test pass number",
  "Your driving test booking reference",
  "Your GOV.UK login details",
  "Payment to anyone promising a test slot",
] as const;

/**
 * Marketing/UI phrases that must never appear in app source (PRD §31).
 * `pnpm check:compliance` scans apps/web for these and fails on any hit.
 * Single source of truth: ./banned-phrases.json (also read directly by the lint).
 */
export const BANNED_PHRASES: readonly string[] = bannedPhrases;
