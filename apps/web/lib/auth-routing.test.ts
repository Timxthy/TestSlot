import { describe, expect, it } from "vitest";
import {
  APP_HOME,
  authRedirect,
  isAppRoute,
  safeInternalPath,
} from "./auth-routing";

describe("authRedirect", () => {
  it("sends signed-in users from guest-only pages into the app", () => {
    for (const path of ["/", "/login", "/signup"]) {
      expect(authRedirect(path, true)).toBe(APP_HOME);
    }
  });

  it("leaves signed-out users on guest-only pages", () => {
    for (const path of ["/", "/login", "/signup"]) {
      expect(authRedirect(path, false)).toBeNull();
    }
  });

  it("sends signed-out users on app routes to login with a next param", () => {
    expect(authRedirect("/settings", false)).toBe("/login?next=%2Fsettings");
    expect(authRedirect("/centres/reading", false)).toBe(
      "/login?next=%2Fcentres%2Freading",
    );
  });

  it("preserves the original query string in the login next param", () => {
    expect(authRedirect("/report", false, "centre=reading")).toBe(
      "/login?next=%2Freport%3Fcentre%3Dreading",
    );
  });

  it("leaves signed-in users on their app routes alone", () => {
    for (const path of ["/dashboard", "/settings", "/admin", "/centres/reading"]) {
      expect(authRedirect(path, true)).toBeNull();
    }
  });

  it("never redirects public marketing routes regardless of auth", () => {
    for (const path of ["/how-it-works", "/test-centres", "/safety"]) {
      expect(authRedirect(path, true)).toBeNull();
      expect(authRedirect(path, false)).toBeNull();
    }
  });
});

describe("isAppRoute", () => {
  it("matches authed page routes (exact + nested), not public ones", () => {
    expect(isAppRoute("/dashboard")).toBe(true);
    expect(isAppRoute("/centres/reading")).toBe(true);
    expect(isAppRoute("/test-centres")).toBe(false);
    expect(isAppRoute("/")).toBe(false);
    // Not a prefix false-positive: /reports shouldn't match /report.
    expect(isAppRoute("/reportage")).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("accepts same-site absolute paths", () => {
    expect(safeInternalPath("/settings")).toBe("/settings");
    expect(safeInternalPath("/centres/reading?x=1")).toBe("/centres/reading?x=1");
  });

  it("rejects open-redirect attempts and empties", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("evil")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});
