import { z } from "zod";
import { isKnownCentre } from "./centres";

export const REPORT_TYPES = [
  "no_tests_found",
  "tests_available",
  "cancellation_seen",
  "queue_too_long",
  "govuk_error",
  "other",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  no_tests_found: "No tests found",
  tests_available: "Tests available",
  cancellation_seen: "Cancellation seen",
  queue_too_long: "Queue too long",
  govuk_error: "GOV.UK error",
  other: "Not sure",
};

/** Report types that indicate availability worth checking. */
export const AVAILABILITY_TYPES: ReportType[] = ["tests_available", "cancellation_seen"];

export const TIME_BANDS = ["early_morning", "morning", "afternoon", "evening"] as const;
export type TimeBand = (typeof TIME_BANDS)[number];

export const TIME_BAND_LABELS: Record<TimeBand, string> = {
  early_morning: "Early (5–8am)",
  morning: "Morning (8am–12)",
  afternoon: "Afternoon (12–5)",
  evening: "Evening (5–10pm)",
};

export function bandForHour(hour: number): TimeBand {
  if (hour < 8) return "early_morning";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/** Hours a report stays useful, per type (PRD §13.2). */
export const DECAY_HOURS: Record<ReportType, number> = {
  cancellation_seen: 1,
  tests_available: 6,
  no_tests_found: 24,
  queue_too_long: 6,
  govuk_error: 6,
  other: 12,
};

/** ISO time a report of this type stops counting, measured from when checked. */
export function computeDecaysAt(type: ReportType, checkedAt: string | Date = new Date()): string {
  const base = typeof checkedAt === "string" ? new Date(checkedAt) : checkedAt;
  return new Date(base.getTime() + DECAY_HOURS[type] * 3_600_000).toISOString();
}

export interface AvailabilityReport {
  id: string;
  centreSlug: string;
  userId: string;
  type: ReportType;
  /** When the user actually checked GOV.UK (ISO). */
  checkedAt: string;
  /** Earliest month they saw, e.g. "2026-08". */
  earliestMonth?: string;
  timeBand?: TimeBand;
  /** 0–100, trust-weighted at submission. */
  confidence: number;
  note?: string;
  createdAt: string;
}

/** What a learner submits after checking GOV.UK. */
export const reportInputSchema = z.object({
  centreSlug: z
    .string()
    .min(1, "Choose a centre.")
    .refine(isKnownCentre, "Unknown centre."),
  type: z.enum(REPORT_TYPES, { required_error: "Tell us what you saw." }),
  earliestMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Use the month picker.")
    .optional(),
  timeBand: z.enum(TIME_BANDS).optional(),
  note: z.string().max(280, "Keep notes under 280 characters.").optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;
