import { describe, expect, it } from "vitest";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE,
  consentFromCookieString,
  expireConsentCookie,
  parseConsent,
  serializeConsentCookie,
  shouldLoadAnalytics,
  shouldShowConsentBanner,
} from "./consent";

describe("parseConsent", () => {
  it("narrows valid choices and rejects everything else", () => {
    expect(parseConsent("granted")).toBe("granted");
    expect(parseConsent("denied")).toBe("denied");
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });
});

describe("consentFromCookieString", () => {
  it("extracts the choice from a cookie header among others", () => {
    expect(
      consentFromCookieString(`foo=bar; ${CONSENT_COOKIE}=granted; baz=qux`),
    ).toBe("granted");
    expect(consentFromCookieString(`${CONSENT_COOKIE}=denied`)).toBe("denied");
  });

  it("returns null when the cookie is absent or empty", () => {
    expect(consentFromCookieString("foo=bar")).toBeNull();
    expect(consentFromCookieString("")).toBeNull();
    expect(consentFromCookieString(undefined)).toBeNull();
  });

  it("round-trips with serializeConsentCookie", () => {
    const cookie = serializeConsentCookie("granted");
    // The serialised value starts with `name=value; ...attrs` — the parser only
    // needs the name=value pair, which is the first segment.
    expect(cookie.startsWith(`${CONSENT_COOKIE}=granted`)).toBe(true);
    expect(consentFromCookieString(cookie.split(";")[0])).toBe("granted");
  });
});

describe("shouldLoadAnalytics", () => {
  it("requires both a key and explicit consent", () => {
    expect(shouldLoadAnalytics("phc_key", "granted")).toBe(true);
    expect(shouldLoadAnalytics("phc_key", "denied")).toBe(false);
    expect(shouldLoadAnalytics("phc_key", null)).toBe(false);
    expect(shouldLoadAnalytics("", "granted")).toBe(false);
    expect(shouldLoadAnalytics(undefined, "granted")).toBe(false);
  });
});

describe("expireConsentCookie", () => {
  it("clears the cookie (Max-Age=0) so the choice reverts to undecided", () => {
    const cookie = expireConsentCookie();
    expect(cookie.startsWith(`${CONSENT_COOKIE}=`)).toBe(true);
    expect(cookie).toContain("Max-Age=0");
    // The cleared value no longer parses to a choice.
    expect(consentFromCookieString(cookie.split(";")[0])).toBeNull();
  });

  it("exposes a stable event name for the re-prompt control", () => {
    expect(CONSENT_CHANGE_EVENT).toBe("tsr:consent-change");
  });
});

describe("shouldShowConsentBanner", () => {
  it("shows only when configured AND undecided", () => {
    expect(shouldShowConsentBanner("phc_key", null)).toBe(true);
    expect(shouldShowConsentBanner("phc_key", "granted")).toBe(false);
    expect(shouldShowConsentBanner("phc_key", "denied")).toBe(false);
    // No key configured → nothing to consent to, so never show the banner.
    expect(shouldShowConsentBanner("", null)).toBe(false);
    expect(shouldShowConsentBanner(undefined, null)).toBe(false);
  });
});
