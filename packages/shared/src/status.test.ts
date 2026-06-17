import { describe, it, expect } from "vitest";
import { computeCentreStatus, computeHeatmap } from "./status";
import type { AvailabilityReport, ReportType, TimeBand } from "./reports";

const NOW = new Date("2026-06-17T12:00:00Z");
let seq = 0;

function rep(type: ReportType, userId: string, minsAgo: number, timeBand?: TimeBand): AvailabilityReport {
  const iso = new Date(NOW.getTime() - minsAgo * 60_000).toISOString();
  return { id: `r${seq++}`, centreSlug: "x", userId, type, checkedAt: iso, timeBand, confidence: 60, createdAt: iso };
}

describe("computeCentreStatus", () => {
  it("is unclear with no reports (confidence 0)", () => {
    const res = computeCentreStatus([], NOW);
    expect(res.status).toBe("unclear");
    expect(res.confidence).toBe(0);
  });

  it("is active_now with 3 unique availability reporters in 60 min", () => {
    const reports = [
      rep("tests_available", "u1", 5),
      rep("cancellation_seen", "u2", 20),
      rep("tests_available", "u3", 45),
    ];
    expect(computeCentreStatus(reports, NOW).status).toBe("active_now");
  });

  it("is recently_active with 2 availability reports in 24h but not 3 unique in 60 min", () => {
    const reports = [rep("tests_available", "u1", 90), rep("tests_available", "u1", 120)];
    expect(computeCentreStatus(reports, NOW).status).toBe("recently_active");
  });

  it("is dry with 10+ no-test reports from 5+ users over 3 days and no availability", () => {
    const reports: AvailabilityReport[] = [];
    for (let i = 0; i < 10; i++) reports.push(rep("no_tests_found", `u${i % 5}`, 200 + i * 200));
    expect(computeCentreStatus(reports, NOW).status).toBe("dry");
  });

  it("is high_queue with 3 queue reports in 2h", () => {
    const reports = [
      rep("queue_too_long", "u1", 10),
      rep("queue_too_long", "u2", 40),
      rep("queue_too_long", "u3", 90),
    ];
    expect(computeCentreStatus(reports, NOW).status).toBe("high_queue");
  });

  it("is error with 3 govuk_error reports in 2h", () => {
    const reports = [
      rep("govuk_error", "u1", 10),
      rep("govuk_error", "u2", 40),
      rep("govuk_error", "u3", 90),
    ];
    expect(computeCentreStatus(reports, NOW).status).toBe("error");
  });

  it("is quiet with low no-test volume below the dry threshold", () => {
    const reports = [
      rep("no_tests_found", "u1", 300),
      rep("no_tests_found", "u2", 600),
      rep("no_tests_found", "u1", 900),
    ];
    expect(computeCentreStatus(reports, NOW).status).toBe("quiet");
  });

  it("prioritises active_now over queue signals", () => {
    const reports = [
      rep("tests_available", "u1", 5),
      rep("tests_available", "u2", 10),
      rep("tests_available", "u3", 15),
      rep("queue_too_long", "u4", 20),
      rep("queue_too_long", "u5", 30),
      rep("queue_too_long", "u6", 40),
    ];
    expect(computeCentreStatus(reports, NOW).status).toBe("active_now");
  });
});

describe("computeHeatmap", () => {
  it("buckets availability reports by day/band and ignores non-availability", () => {
    const day = "2026-06-15T09:00:00Z"; // within 14 days of NOW
    const reports: AvailabilityReport[] = [
      { id: "h1", centreSlug: "x", userId: "u1", type: "tests_available", checkedAt: day, timeBand: "morning", confidence: 60, createdAt: day },
      { id: "h2", centreSlug: "x", userId: "u2", type: "cancellation_seen", checkedAt: day, timeBand: "morning", confidence: 60, createdAt: day },
      { id: "h3", centreSlug: "x", userId: "u3", type: "no_tests_found", checkedAt: day, timeBand: "morning", confidence: 60, createdAt: day },
    ];
    const hm = computeHeatmap(reports, NOW);
    expect(hm.max).toBe(2);
    expect(hm.cells.reduce((sum, c) => sum + c.count, 0)).toBe(2);
  });
});
