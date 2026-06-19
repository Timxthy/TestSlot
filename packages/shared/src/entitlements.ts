// Subscription tiers & entitlements (PRD §14, §6.13). Modelled now; billing
// (RevenueCat/Stripe) is Phase 3 — everyone is `free` until then. Tiers are
// granted server-side only; clients never self-assign.

export const TIERS = ["free", "premium", "instructor"] as const;
export type Tier = (typeof TIERS)[number];

export interface Entitlements {
  /** Max centres a user may follow. */
  followLimit: number;
  /** Instant alerts vs the free-tier delay. */
  instantAlerts: boolean;
  /** Access to the availability heatmap. */
  heatmapAccess: boolean;
  /** Weekly summary digest. */
  weeklySummary: boolean;
}

/** How long free-tier alerts are held back; premium/instructor are instant. */
export const FREE_ALERT_DELAY_MINUTES = 15;

export const ENTITLEMENTS: Record<Tier, Entitlements> = {
  free: { followLimit: 3, instantAlerts: false, heatmapAccess: false, weeklySummary: true },
  premium: { followLimit: 10, instantAlerts: true, heatmapAccess: true, weeklySummary: true },
  instructor: { followLimit: 10, instantAlerts: true, heatmapAccess: true, weeklySummary: true },
};

export function normaliseTier(tier: string | null | undefined): Tier {
  return (TIERS as readonly string[]).includes(tier ?? "") ? (tier as Tier) : "free";
}

export function entitlementsForTier(tier: string | null | undefined): Entitlements {
  return ENTITLEMENTS[normaliseTier(tier)];
}

/**
 * Whether a notification to this recipient should be held back on this run.
 * Instructor-authored posts and premium/instructor recipients are instant; free
 * recipients wait until the post is older than the delay window.
 */
export function shouldDelayDelivery(
  tier: string | null | undefined,
  postAgeMinutes: number,
  fromInstructor = false,
  delayMinutes: number = FREE_ALERT_DELAY_MINUTES,
): boolean {
  if (fromInstructor) return false;
  if (entitlementsForTier(tier).instantAlerts) return false;
  return postAgeMinutes < delayMinutes;
}
