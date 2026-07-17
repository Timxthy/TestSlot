import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS } from "./events";

describe("ANALYTICS_EVENTS", () => {
  it("has no duplicate event names", () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });

  it("covers the core funnel the routes emit", () => {
    for (const e of [
      "signup_completed",
      "report_submitted",
      "report_scam_blocked",
      "cancellation_posted",
      "centre_followed",
      "account_exported",
    ] as const) {
      expect(ANALYTICS_EVENTS).toContain(e);
    }
  });
});
