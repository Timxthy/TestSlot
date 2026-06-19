import { describe, expect, it } from "vitest";
import { entitlementsForTier, shouldDelayDelivery } from "./entitlements";

describe("entitlementsForTier", () => {
  it("free is the limited default (incl. unknown tiers)", () => {
    expect(entitlementsForTier("free").followLimit).toBe(3);
    expect(entitlementsForTier("free").instantAlerts).toBe(false);
    expect(entitlementsForTier("free").heatmapAccess).toBe(false);
    expect(entitlementsForTier(null)).toEqual(entitlementsForTier("free"));
    expect(entitlementsForTier("bogus")).toEqual(entitlementsForTier("free"));
  });

  it("premium/instructor unlock instant alerts, heatmap, more follows", () => {
    for (const tier of ["premium", "instructor"]) {
      expect(entitlementsForTier(tier).followLimit).toBe(10);
      expect(entitlementsForTier(tier).instantAlerts).toBe(true);
      expect(entitlementsForTier(tier).heatmapAccess).toBe(true);
    }
  });
});

describe("shouldDelayDelivery", () => {
  it("holds fresh free-tier alerts, releases once past the window", () => {
    expect(shouldDelayDelivery("free", 5)).toBe(true);
    expect(shouldDelayDelivery("free", 20)).toBe(false);
  });

  it("premium is always instant", () => {
    expect(shouldDelayDelivery("premium", 1)).toBe(false);
  });

  it("instructor-authored posts are instant for everyone, even fresh + free", () => {
    expect(shouldDelayDelivery("free", 1, true)).toBe(false);
  });
});
