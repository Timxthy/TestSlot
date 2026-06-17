import {
  AVAILABILITY_TYPES,
  TIME_BANDS,
  type AvailabilityReport,
  type TimeBand,
  bandForHour,
} from "./reports";

export const CENTRE_STATUSES = [
  "active_now",
  "recently_active",
  "high_queue",
  "error",
  "dry",
  "quiet",
  "unclear",
] as const;
export type CentreStatus = (typeof CENTRE_STATUSES)[number];

export type StatusTone = "good" | "warn" | "bad" | "neutral";

export const STATUS_META: Record<CentreStatus, { label: string; tone: StatusTone }> = {
  active_now: { label: "Active now", tone: "good" },
  recently_active: { label: "Recently active", tone: "good" },
  high_queue: { label: "High queue reports", tone: "warn" },
  error: { label: "GOV.UK errors reported", tone: "warn" },
  dry: { label: "Dry", tone: "bad" },
  quiet: { label: "Quiet", tone: "neutral" },
  unclear: { label: "Unclear", tone: "neutral" },
};

/** Thresholds (PRD §13.3). Kept here so they're tunable without touching logic. */
export const STATUS_RULES = {
  activeNow: { windowMins: 60, minUniqueUsers: 3 },
  recentlyActive: { windowHours: 24, minReports: 2 },
  dry: { windowDays: 3, minReports: 10, minUniqueUsers: 5 },
  highQueue: { windowHours: 2, minReports: 3 },
  error: { windowHours: 2, minReports: 3 },
} as const;

export interface CentreStatusResult {
  status: CentreStatus;
  confidence: number;
  metrics: {
    availabilityReports24h: number;
    uniqueReporters24h: number;
    noTestReports3d: number;
    lastReportAt: string | null;
    totalReports7d: number;
  };
}

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function within(iso: string, now: number, ms: number): boolean {
  return now - new Date(iso).getTime() <= ms;
}

export function computeCentreStatus(
  reports: AvailabilityReport[],
  now: Date = new Date(),
): CentreStatusResult {
  const t = now.getTime();
  const isAvail = (r: AvailabilityReport) => AVAILABILITY_TYPES.includes(r.type);

  const avail60 = reports.filter((r) => isAvail(r) && within(r.checkedAt, t, 60 * MIN));
  const uniqueAvail60 = new Set(avail60.map((r) => r.userId)).size;

  const avail24 = reports.filter((r) => isAvail(r) && within(r.checkedAt, t, 24 * HOUR));
  const uniqueAvail24 = new Set(avail24.map((r) => r.userId)).size;

  const noTest3d = reports.filter(
    (r) => r.type === "no_tests_found" && within(r.checkedAt, t, 3 * DAY),
  );
  const uniqueNoTest3d = new Set(noTest3d.map((r) => r.userId)).size;
  const avail3d = reports.filter((r) => isAvail(r) && within(r.checkedAt, t, 3 * DAY));

  const queue2h = reports.filter(
    (r) => r.type === "queue_too_long" && within(r.checkedAt, t, 2 * HOUR),
  );
  const error2h = reports.filter(
    (r) => r.type === "govuk_error" && within(r.checkedAt, t, 2 * HOUR),
  );

  const reports7d = reports.filter((r) => within(r.checkedAt, t, 7 * DAY));
  const lastReportAt = reports.reduce<string | null>(
    (acc, r) => (!acc || r.checkedAt > acc ? r.checkedAt : acc),
    null,
  );

  let status: CentreStatus;
  if (uniqueAvail60 >= STATUS_RULES.activeNow.minUniqueUsers) {
    status = "active_now";
  } else if (avail24.length >= STATUS_RULES.recentlyActive.minReports) {
    status = "recently_active";
  } else if (queue2h.length >= STATUS_RULES.highQueue.minReports) {
    status = "high_queue";
  } else if (error2h.length >= STATUS_RULES.error.minReports) {
    status = "error";
  } else if (
    noTest3d.length >= STATUS_RULES.dry.minReports &&
    uniqueNoTest3d >= STATUS_RULES.dry.minUniqueUsers &&
    avail3d.length === 0
  ) {
    status = "dry";
  } else if (reports7d.length > 0) {
    status = "quiet";
  } else {
    status = "unclear";
  }

  const uniqueAll = new Set(reports7d.map((r) => r.userId)).size;
  let confidence = Math.min(100, uniqueAll * 12 + (status === "active_now" ? 30 : 0));
  if (reports7d.length === 0) confidence = 0;

  return {
    status,
    confidence,
    metrics: {
      availabilityReports24h: avail24.length,
      uniqueReporters24h: uniqueAvail24,
      noTestReports3d: noTest3d.length,
      lastReportAt,
      totalReports7d: reports7d.length,
    },
  };
}

export interface HeatmapResult {
  cells: { day: number; band: TimeBand; count: number }[];
  max: number;
}

/** Availability reports bucketed by day-of-week × time band (PRD §13.4). */
export function computeHeatmap(
  reports: AvailabilityReport[],
  now: Date = new Date(),
  days = 14,
): HeatmapResult {
  const cutoff = now.getTime() - days * DAY;
  const counts = new Map<string, number>();
  let max = 0;

  for (const r of reports) {
    if (!AVAILABILITY_TYPES.includes(r.type)) continue;
    const d = new Date(r.checkedAt);
    if (d.getTime() < cutoff) continue;
    const band = r.timeBand ?? bandForHour(d.getHours());
    const key = `${d.getDay()}:${band}`;
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    if (next > max) max = next;
  }

  const cells: { day: number; band: TimeBand; count: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (const band of TIME_BANDS) {
      cells.push({ day, band, count: counts.get(`${day}:${band}`) ?? 0 });
    }
  }
  return { cells, max };
}
