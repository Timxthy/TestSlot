import { randomUUID } from "node:crypto";
import {
  DEFAULT_REMINDER_TIMES,
  DEFAULT_TIMEZONE,
  TEST_CENTRES,
  computeCentreStatus,
  computeHeatmap,
  getCentreBySlug,
  normaliseReminderTimes,
  screenForScam,
  type AvailabilityReport,
  type CancellationInput,
  type CancellationPost,
  type CentreStatusResult,
  type HeatmapResult,
  type ReminderPreferences,
  type ReportInput,
  type TestCentre,
} from "@testslot/shared";
import type { DataStore } from "./store";
import { generateSeedCancellations, generateSeedReports } from "./seed";

class MockStore implements DataStore {
  private reports: AvailabilityReport[] = generateSeedReports();
  private cancellations: CancellationPost[] = generateSeedCancellations();
  private follows = new Map<string, Set<string>>([
    ["demo-user", new Set(["high-wycombe", "aylesbury", "slough", "reading"])],
  ]);
  private confirmations: { reportId: string; userId: string; agrees: boolean }[] = [];
  private reminderPrefs = new Map<string, ReminderPreferences>();
  private deviceTokens: { userId: string; endpoint: string; subscription: unknown }[] = [];

  async listCentres(): Promise<TestCentre[]> {
    return TEST_CENTRES;
  }

  async getCentre(slug: string): Promise<TestCentre | undefined> {
    return getCentreBySlug(slug);
  }

  private reportsFor(slug: string): AvailabilityReport[] {
    return this.reports.filter((r) => r.centreSlug === slug);
  }

  async getCentreStatus(slug: string): Promise<CentreStatusResult> {
    return computeCentreStatus(this.reportsFor(slug));
  }

  async listCentreStatuses(): Promise<Record<string, CentreStatusResult>> {
    const out: Record<string, CentreStatusResult> = {};
    for (const centre of TEST_CENTRES) {
      out[centre.slug] = computeCentreStatus(this.reportsFor(centre.slug));
    }
    return out;
  }

  async getHeatmap(slug: string): Promise<HeatmapResult> {
    return computeHeatmap(this.reportsFor(slug));
  }

  async listReports(slug: string, limit = 20): Promise<AvailabilityReport[]> {
    return this.reportsFor(slug)
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
      .slice(0, limit);
  }

  async createReport(input: ReportInput, userId: string): Promise<AvailabilityReport> {
    const now = new Date().toISOString();
    const report: AvailabilityReport = {
      id: randomUUID(),
      centreSlug: input.centreSlug,
      userId,
      type: input.type,
      checkedAt: now,
      earliestMonth: input.earliestMonth,
      timeBand: input.timeBand,
      confidence: 60,
      note: input.note,
      createdAt: now,
    };
    this.reports.push(report);
    return report;
  }

  async confirmReport(reportId: string, userId: string, agrees: boolean): Promise<void> {
    // Parity with the DB trigger: a user can't confirm their own report.
    const report = this.reports.find((r) => r.id === reportId);
    if (report && report.userId === userId) {
      throw new Error("cannot confirm your own report");
    }
    const existing = this.confirmations.find(
      (c) => c.reportId === reportId && c.userId === userId,
    );
    if (existing) existing.agrees = agrees;
    else this.confirmations.push({ reportId, userId, agrees });
  }

  async getUserConfirmations(
    userId: string,
    reportIds: string[],
  ): Promise<Record<string, boolean>> {
    const ids = new Set(reportIds);
    const out: Record<string, boolean> = {};
    for (const c of this.confirmations) {
      if (c.userId === userId && ids.has(c.reportId)) out[c.reportId] = c.agrees;
    }
    return out;
  }

  async listFollows(userId: string): Promise<string[]> {
    return [...(this.follows.get(userId) ?? new Set())];
  }

  async follow(userId: string, slug: string): Promise<void> {
    const set = this.follows.get(userId) ?? new Set<string>();
    set.add(slug);
    this.follows.set(userId, set);
  }

  async unfollow(userId: string, slug: string): Promise<void> {
    this.follows.get(userId)?.delete(slug);
  }

  async getSubscriptionTier(_userId: string): Promise<string> {
    return "free";
  }

  async getReminderPreferences(userId: string): Promise<ReminderPreferences> {
    return (
      this.reminderPrefs.get(userId) ?? {
        times: DEFAULT_REMINDER_TIMES,
        timezone: DEFAULT_TIMEZONE,
        enabled: true,
        channels: ["web_push"],
      }
    );
  }

  async saveReminderPreferences(
    userId: string,
    input: { times: string[]; enabled: boolean },
  ): Promise<ReminderPreferences> {
    const prefs: ReminderPreferences = {
      times: normaliseReminderTimes(input.times),
      timezone: DEFAULT_TIMEZONE,
      enabled: input.enabled,
      channels: ["web_push"],
    };
    this.reminderPrefs.set(userId, prefs);
    return prefs;
  }

  async saveDeviceToken(
    userId: string,
    subscription: unknown,
    endpoint: string,
  ): Promise<void> {
    const existing = this.deviceTokens.find(
      (t) => t.userId === userId && t.endpoint === endpoint,
    );
    if (existing) existing.subscription = subscription;
    else this.deviceTokens.push({ userId, endpoint, subscription });
  }

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    return {
      exportedAt: new Date().toISOString(),
      profile: { id: userId },
      follows: [...(this.follows.get(userId) ?? [])],
      reports: this.reports.filter((r) => r.userId === userId),
      cancellations: this.cancellations.filter((c) => c.userId === userId),
      confirmations: this.confirmations.filter((c) => c.userId === userId),
      reminderPreferences: this.reminderPrefs.get(userId) ?? null,
      deviceTokens: this.deviceTokens.filter((t) => t.userId === userId),
      notificationDeliveries: [],
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // Anonymise authorship so aggregates survive, then drop PII.
    for (const r of this.reports) {
      if (r.userId === userId) r.userId = `anon-${randomUUID()}`;
    }
    this.cancellations = this.cancellations.filter((c) => c.userId !== userId);
    this.confirmations = this.confirmations.filter((c) => c.userId !== userId);
    this.deviceTokens = this.deviceTokens.filter((t) => t.userId !== userId);
    this.follows.delete(userId);
    this.reminderPrefs.delete(userId);
  }

  async listCancellations(slug?: string): Promise<CancellationPost[]> {
    const now = Date.now();
    return this.cancellations
      .filter((c) => c.moderationStatus === "approved" && c.status === "active")
      .filter((c) => new Date(c.expiresAt).getTime() > now)
      .filter((c) => (slug ? c.centreSlug === slug : true))
      .sort((a, b) => a.plannedCancelAt.localeCompare(b.plannedCancelAt));
  }

  async createCancellation(
    input: CancellationInput,
    user: { id: string; name: string; isInstructor: boolean },
  ): Promise<{ post: CancellationPost; flagged: boolean }> {
    const { flagged } = screenForScam(input.note ?? "");
    const now = new Date();
    const post: CancellationPost = {
      id: randomUUID(),
      centreSlug: input.centreSlug,
      userId: user.id,
      authorName: user.name,
      isInstructor: user.isInstructor,
      plannedCancelAt: input.plannedCancelAt,
      testMonth: input.testMonth,
      note: input.note,
      status: "active",
      moderationStatus: flagged ? "pending" : "approved",
      createdAt: now.toISOString(),
      expiresAt: new Date(
        new Date(input.plannedCancelAt).getTime() + 60 * 60_000,
      ).toISOString(),
    };
    this.cancellations.push(post);
    return { post, flagged };
  }

  async listPendingCancellations(): Promise<CancellationPost[]> {
    return this.cancellations
      .filter((c) => c.moderationStatus === "pending")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async setCancellationModeration(
    id: string,
    status: "approved" | "rejected",
  ): Promise<void> {
    const post = this.cancellations.find((c) => c.id === id);
    if (post) post.moderationStatus = status;
  }
}

// Module singleton — survives within a server process so submitted reports persist.
const globalRef = globalThis as unknown as { __mockStore?: MockStore };
export const mockStore: MockStore = globalRef.__mockStore ?? (globalRef.__mockStore = new MockStore());
