/** Roles a person can self-identify as on the waitlist / in the app. */
export const ROLES = ["learner", "instructor", "parent"] as const;
export type Role = (typeof ROLES)[number];

/** A UK practical driving test centre (static, public information only). */
export interface TestCentre {
  /** URL slug, e.g. "high-wycombe" */
  slug: string;
  /** Display name, e.g. "High Wycombe" */
  name: string;
  /** County, e.g. "Buckinghamshire" */
  county: string;
  /** Representative outward postcode, e.g. "HP13" (seed value — verify against the public GOV.UK list) */
  postcodeArea: string;
  /** Slugs of nearby centres learners often consider as alternatives */
  nearby: string[];
  /** Short, compliance-safe description for the centre page */
  blurb: string;
}
