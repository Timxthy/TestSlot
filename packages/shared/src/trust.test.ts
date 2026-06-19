import { describe, expect, it } from "vitest";
import {
  computeTrust,
  computeTrustScore,
  gatesToModeration,
  trustLevelFromScore,
  trustWeight,
  trustWeightForScore,
  type TrustInputs,
} from "./trust";

const base: TrustInputs = {
  accountAgeDays: 0,
  confirmedReports: 0,
  flags: 0,
  abuseReports: 0,
  postingRatePerDay: 0,
  scamSimilarity: 0,
  isInstructorVerified: false,
};

describe("computeTrustScore", () => {
  it("a brand-new account starts at the neutral baseline (50 = normal)", () => {
    expect(computeTrustScore(base)).toBe(50);
    expect(trustLevelFromScore(50)).toBe("normal");
  });

  it("age and confirmed reports raise the score, each capped", () => {
    expect(computeTrustScore({ ...base, accountAgeDays: 200 })).toBe(70); // +20 cap
    expect(computeTrustScore({ ...base, confirmedReports: 100 })).toBe(70); // +20 cap
    expect(
      computeTrustScore({ ...base, accountAgeDays: 200, confirmedReports: 100 }),
    ).toBe(90);
  });

  it("flags, abuse, scam and spammy posting lower the score", () => {
    expect(computeTrustScore({ ...base, flags: 3 })).toBe(20);
    expect(computeTrustScore({ ...base, scamSimilarity: 0.9 })).toBe(25);
    expect(computeTrustScore({ ...base, postingRatePerDay: 50 })).toBe(35);
    expect(computeTrustScore({ ...base, abuseReports: 10 })).toBe(10); // -40 cap
  });

  it("clamps to 0–100", () => {
    expect(computeTrustScore({ ...base, flags: 99, abuseReports: 99 })).toBe(0);
    expect(
      computeTrustScore({
        ...base,
        accountAgeDays: 999,
        confirmedReports: 999,
        isInstructorVerified: true,
      }),
    ).toBe(100); // 50 + 20 + 20 + 15 = 105 → clamped
  });
});

describe("computeTrust level gates", () => {
  it("flags 5+ abuse reports as banned regardless of other signal", () => {
    expect(computeTrust({ ...base, accountAgeDays: 999, abuseReports: 5 }).level).toBe(
      "banned",
    );
  });

  it("verified instructors are the verified level", () => {
    expect(computeTrust({ ...base, isInstructorVerified: true }).level).toBe("verified");
  });

  it("maps score bands to levels", () => {
    expect(trustLevelFromScore(10)).toBe("restricted");
    expect(trustLevelFromScore(25)).toBe("watchlist");
    expect(trustLevelFromScore(40)).toBe("new");
    expect(trustLevelFromScore(60)).toBe("normal");
    expect(trustLevelFromScore(75)).toBe("trusted");
    expect(trustLevelFromScore(90)).toBe("verified");
  });
});

describe("trust weights", () => {
  it("higher trust weighs more; restricted/banned weigh little or nothing", () => {
    expect(trustWeight("banned")).toBe(0);
    expect(trustWeight("normal")).toBe(1);
    expect(trustWeight("trusted")).toBe(1.5);
    expect(trustWeight("verified")).toBe(2);
  });

  it("trustWeightForScore composes score → level → weight", () => {
    expect(trustWeightForScore(50)).toBe(1); // normal
    expect(trustWeightForScore(75)).toBe(1.5); // trusted
    expect(trustWeightForScore(10)).toBe(0.25); // restricted
  });
});

describe("gatesToModeration", () => {
  it("gates banned and restricted, lets others auto-publish", () => {
    expect(gatesToModeration("banned")).toBe(true);
    expect(gatesToModeration("restricted")).toBe(true);
    expect(gatesToModeration("watchlist")).toBe(false);
    expect(gatesToModeration("normal")).toBe(false);
  });
});
