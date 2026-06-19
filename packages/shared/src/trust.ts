// Trust scoring (PRD §13). The internal score is an int 0–100 stored on
// profiles.trust_score, recomputed on a schedule. It is used to (a) weight a
// centre's confidence and (b) gate auto-publish vs moderation. We never expose
// the raw number — only the level label.
//
// This module is the documented source of truth for the model. The SQL in
// supabase/migrations/0006_trust.sql (recompute_trust_scores / trust_weight_for_score)
// mirrors the formulas below and must be kept in sync.

export const TRUST_LEVELS = [
  "banned",
  "restricted",
  "watchlist",
  "new",
  "normal",
  "trusted",
  "verified",
] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

export const TRUST_LABELS: Record<TrustLevel, string> = {
  banned: "Banned",
  restricted: "Restricted",
  watchlist: "Watchlist",
  new: "New",
  normal: "Member",
  trusted: "Trusted",
  verified: "Verified instructor",
};

export interface TrustInputs {
  /** Whole days since the account was created. */
  accountAgeDays: number;
  /** How many of the user's reports others have agreed with. */
  confirmedReports: number;
  /** Content flags raised against the user's submissions. */
  flags: number;
  /** Times the user has been reported for abuse. */
  abuseReports: number;
  /** Recent average reports per day (spam signal). */
  postingRatePerDay: number;
  /** Max scam-pattern similarity seen on their notes (0–1). */
  scamSimilarity: number;
  isInstructorVerified: boolean;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** The raw 0–100 score. Mirrored by recompute_trust_scores() in SQL. */
export function computeTrustScore(i: TrustInputs): number {
  let s = 50;
  s += Math.min(20, Math.floor(i.accountAgeDays * 0.5)); // ~40 days → +20
  s += Math.min(20, i.confirmedReports * 2); // 10 confirmed → +20
  s += i.isInstructorVerified ? 15 : 0;
  s -= Math.min(40, i.flags * 10);
  s -= Math.min(40, i.abuseReports * 8);
  s -= i.scamSimilarity >= 0.8 ? 25 : 0;
  s -= i.postingRatePerDay > 30 ? 15 : 0;
  return clamp(Math.round(s), 0, 100);
}

/**
 * Level from the score alone — used for the confidence weight and for a label
 * derived from a stored score. Mirrored by trust_weight_for_score() in SQL.
 */
export function trustLevelFromScore(score: number): TrustLevel {
  if (score < 20) return "restricted";
  if (score < 35) return "watchlist";
  if (score < 50) return "new";
  if (score < 70) return "normal";
  if (score < 85) return "trusted";
  return "verified";
}

/** Full level including the hard gates (abuse → banned, instructor → verified). */
export function computeTrust(i: TrustInputs): { score: number; level: TrustLevel } {
  const score = computeTrustScore(i);
  let level: TrustLevel;
  if (i.abuseReports >= 5 || score <= 5) level = "banned";
  else if (i.isInstructorVerified) level = "verified";
  else level = trustLevelFromScore(score);
  return { score, level };
}

export const TRUST_WEIGHTS: Record<TrustLevel, number> = {
  banned: 0,
  restricted: 0.25,
  watchlist: 0.5,
  new: 0.75,
  normal: 1,
  trusted: 1.5,
  verified: 2,
};

export function trustWeight(level: TrustLevel): number {
  return TRUST_WEIGHTS[level];
}

/** Confidence weight for a stored score (mirrors SQL trust_weight_for_score). */
export function trustWeightForScore(score: number): number {
  return trustWeight(trustLevelFromScore(score));
}

/** Levels whose submissions should be held for moderation, not auto-published. */
export function gatesToModeration(level: TrustLevel): boolean {
  return level === "banned" || level === "restricted";
}
