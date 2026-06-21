// Cookie-consent primitives (UK GDPR / PECR). Pure, dependency-free, and shared
// by the client banner and any server code that needs to read the choice. No
// browser globals are touched here so it is trivially unit-testable.
//
// Privacy by design: analytics cookies are NEVER set until the user explicitly
// grants consent. Absence of a stored choice means "not yet decided" → no
// tracking, show the banner.

export const CONSENT_COOKIE = "tsr_analytics_consent";

/** 180 days — re-prompt after that so consent stays meaningful. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type ConsentChoice = "granted" | "denied";

/** Narrows an arbitrary stored value to a valid choice, or null if unset/garbage. */
export function parseConsent(
  raw: string | undefined | null,
): ConsentChoice | null {
  if (raw === "granted") return "granted";
  if (raw === "denied") return "denied";
  return null;
}

/**
 * Reads the consent choice out of a raw cookie string (e.g. `document.cookie`
 * or a request `Cookie` header). Returns null when undecided.
 */
export function consentFromCookieString(
  cookieString: string | undefined | null,
): ConsentChoice | null {
  if (!cookieString) return null;
  for (const part of cookieString.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === CONSENT_COOKIE) {
      return parseConsent(decodeURIComponent(part.slice(eq + 1).trim()));
    }
  }
  return null;
}

/** Serialises a choice into a Set-Cookie / document.cookie value. */
export function serializeConsentCookie(choice: ConsentChoice): string {
  return (
    `${CONSENT_COOKIE}=${choice}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; ` +
    `Path=/; SameSite=Lax`
  );
}

/**
 * The single gate the client loader uses: analytics may run only when a tracking
 * key is configured AND the user has actively granted consent.
 */
export function shouldLoadAnalytics(
  posthogKey: string | undefined | null,
  consent: ConsentChoice | null,
): boolean {
  return Boolean(posthogKey) && consent === "granted";
}

/**
 * Whether to show the consent banner: only when there is something to consent
 * to (a key is configured) and the user has not decided yet. With no analytics
 * configured we set no non-essential cookies, so there is nothing to ask.
 */
export function shouldShowConsentBanner(
  posthogKey: string | undefined | null,
  consent: ConsentChoice | null,
): boolean {
  return Boolean(posthogKey) && consent === null;
}
