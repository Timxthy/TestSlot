import {
  TEST_CENTRES,
  bandForHour,
  type AvailabilityReport,
  type CancellationPost,
  type ReportType,
} from "@testslot/shared";

/** Deterministic PRNG so seeded data is stable across restarts. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Synthetic reports across all launch centres with believable patterns, so the
 * status engine, heatmaps and feeds all render meaningfully (PRD §8 cold-start).
 * Profiles vary per centre: active / recently-active / dry / quiet.
 */
export function generateSeedReports(now = new Date()): AvailabilityReport[] {
  const rng = mulberry32(42);
  const reports: AvailabilityReport[] = [];
  let idc = 0;

  const push = (centreSlug: string, type: ReportType, when: Date, userId: string) => {
    reports.push({
      id: `seed-${idc++}`,
      centreSlug,
      userId,
      type,
      checkedAt: when.toISOString(),
      timeBand: bandForHour(when.getHours()),
      confidence: 50 + Math.floor(rng() * 40),
      createdAt: when.toISOString(),
    });
  };

  TEST_CENTRES.forEach((centre, idx) => {
    const profile = idx % 4; // 0 active, 1 recently, 2 dry, 3 quiet

    for (let d = 0; d < 14; d++) {
      const perDay = 2 + Math.floor(rng() * 6);
      for (let i = 0; i < perDay; i++) {
        const when = new Date(now.getTime() - d * 86_400_000);
        when.setHours(6 + Math.floor(rng() * 15), Math.floor(rng() * 60), 0, 0);

        const roll = rng();
        let type: ReportType;
        if (profile === 2) {
          type = roll < 0.92 ? "no_tests_found" : "queue_too_long";
        } else if (profile === 0) {
          type = roll < 0.5 ? "tests_available" : roll < 0.8 ? "no_tests_found" : "cancellation_seen";
        } else if (profile === 1) {
          type = roll < 0.3 ? "tests_available" : roll < 0.85 ? "no_tests_found" : "queue_too_long";
        } else {
          type =
            roll < 0.6
              ? "no_tests_found"
              : roll < 0.8
                ? "queue_too_long"
                : roll < 0.92
                  ? "govuk_error"
                  : "tests_available";
        }
        push(centre.slug, type, when, `seed-user-${(idx * 7 + i) % 25}`);
      }
    }

    // "Active now": recent availability from 4 unique users within the last hour.
    if (profile === 0) {
      for (let u = 0; u < 4; u++) {
        const when = new Date(now.getTime() - (5 + u * 8) * 60_000);
        push(centre.slug, u % 2 === 0 ? "tests_available" : "cancellation_seen", when, `live-user-${u}`);
      }
    }
  });

  return reports;
}

export function generateSeedCancellations(now = new Date()): CancellationPost[] {
  const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();
  return [
    {
      id: "seed-cancel-1",
      centreSlug: "high-wycombe",
      userId: "seed-user-3",
      authorName: "Aisha (learner)",
      isInstructor: false,
      plannedCancelAt: inHours(3),
      testMonth: "2026-07",
      note: "Cancelling my afternoon slot — others can check GOV.UK after 3pm.",
      status: "active",
      moderationStatus: "approved",
      createdAt: now.toISOString(),
      expiresAt: inHours(4),
    },
    {
      id: "seed-cancel-2",
      centreSlug: "aylesbury",
      userId: "seed-instructor-1",
      authorName: "Mark — Pass First Time",
      isInstructor: true,
      plannedCancelAt: inHours(20),
      testMonth: "2026-08",
      note: "One of my pupils is moving their test tomorrow morning.",
      status: "active",
      moderationStatus: "approved",
      createdAt: now.toISOString(),
      expiresAt: inHours(21),
    },
  ];
}
