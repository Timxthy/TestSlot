import { describe, it, expect } from "vitest";
import { bandForHour, reportInputSchema } from "./reports";

describe("bandForHour", () => {
  it("maps hours to time bands", () => {
    expect(bandForHour(5)).toBe("early_morning");
    expect(bandForHour(7)).toBe("early_morning");
    expect(bandForHour(8)).toBe("morning");
    expect(bandForHour(11)).toBe("morning");
    expect(bandForHour(12)).toBe("afternoon");
    expect(bandForHour(16)).toBe("afternoon");
    expect(bandForHour(17)).toBe("evening");
    expect(bandForHour(22)).toBe("evening");
  });
});

describe("reportInputSchema", () => {
  it("accepts a valid report", () => {
    const res = reportInputSchema.safeParse({
      centreSlug: "slough",
      type: "tests_available",
      earliestMonth: "2026-08",
      timeBand: "morning",
    });
    expect(res.success).toBe(true);
  });

  it("requires a report type", () => {
    expect(reportInputSchema.safeParse({ centreSlug: "slough" }).success).toBe(false);
  });

  it("rejects a malformed month", () => {
    expect(
      reportInputSchema.safeParse({ centreSlug: "slough", type: "tests_available", earliestMonth: "August" }).success,
    ).toBe(false);
  });
});
