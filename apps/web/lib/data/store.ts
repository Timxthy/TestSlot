import type {
  AvailabilityReport,
  CancellationInput,
  CancellationPost,
  CentreStatusResult,
  HeatmapResult,
  ReminderPreferences,
  ReportInput,
  TestCentre,
} from "@testslot/shared";

/** The data access contract. Implemented by the mock store now, Supabase later. */
export interface DataStore {
  listCentres(): Promise<TestCentre[]>;
  getCentre(slug: string): Promise<TestCentre | undefined>;

  getCentreStatus(slug: string): Promise<CentreStatusResult>;
  listCentreStatuses(): Promise<Record<string, CentreStatusResult>>;
  getHeatmap(slug: string): Promise<HeatmapResult>;

  listReports(slug: string, limit?: number): Promise<AvailabilityReport[]>;
  createReport(input: ReportInput, userId: string): Promise<AvailabilityReport>;

  /** Upsert a user's "still there / not there" confirmation on a report. */
  confirmReport(reportId: string, userId: string, agrees: boolean): Promise<void>;
  /** The user's existing confirmations for the given reports, by report id. */
  getUserConfirmations(
    userId: string,
    reportIds: string[],
  ): Promise<Record<string, boolean>>;

  listFollows(userId: string): Promise<string[]>;
  follow(userId: string, slug: string): Promise<void>;
  unfollow(userId: string, slug: string): Promise<void>;

  getReminderPreferences(userId: string): Promise<ReminderPreferences>;
  saveReminderPreferences(
    userId: string,
    input: { times: string[]; enabled: boolean },
  ): Promise<ReminderPreferences>;
  /** Store a browser web-push subscription for this user (deduped by endpoint). */
  saveDeviceToken(userId: string, subscription: unknown, endpoint: string): Promise<void>;

  /** GDPR DSAR: everything we hold about this user, for export. */
  exportUserData(userId: string): Promise<Record<string, unknown>>;
  /**
   * GDPR erasure: remove the user's PII and account, anonymising authorship so
   * aggregates (centre status/heatmap) stay intact. Does not touch the auth
   * identity — the caller deletes that separately.
   */
  deleteUserData(userId: string): Promise<void>;

  listCancellations(slug?: string): Promise<CancellationPost[]>;
  createCancellation(
    input: CancellationInput,
    user: { id: string; name: string; isInstructor: boolean },
  ): Promise<{ post: CancellationPost; flagged: boolean }>;
  listPendingCancellations(): Promise<CancellationPost[]>;
  setCancellationModeration(id: string, status: "approved" | "rejected"): Promise<void>;
}
