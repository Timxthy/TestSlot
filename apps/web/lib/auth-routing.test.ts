import { describe, expect, it } from "vitest";
import { APP_HOME, authRedirect } from "./auth-routing";

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

  it("never redirects app / content / onboarding routes regardless of auth", () => {
    for (const path of [
      "/dashboard",
      "/report",
      "/cancellations",
      "/settings",
      "/admin",
      "/onboarding",
      "/how-it-works",
      "/test-centres",
      "/centres/reading",
    ]) {
      expect(authRedirect(path, true)).toBeNull();
      expect(authRedirect(path, false)).toBeNull();
    }
  });
});
