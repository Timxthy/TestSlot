import type {
  AvailabilityReport,
  CancellationInput,
  CancellationPost,
  CentreStatusResult,
  HeatmapResult,
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

  listFollows(userId: string): Promise<string[]>;
  follow(userId: string, slug: string): Promise<void>;
  unfollow(userId: string, slug: string): Promise<void>;

  listCancellations(slug?: string): Promise<CancellationPost[]>;
  createCancellation(
    input: CancellationInput,
    user: { id: string; name: string; isInstructor: boolean },
  ): Promise<{ post: CancellationPost; flagged: boolean }>;
  listPendingCancellations(): Promise<CancellationPost[]>;
  setCancellationModeration(id: string, status: "approved" | "rejected"): Promise<void>;
}
