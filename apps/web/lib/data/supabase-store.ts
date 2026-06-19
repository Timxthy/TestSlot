import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_REMINDER_TIMES,
  DEFAULT_TIMEZONE,
  TEST_CENTRES,
  TIME_BANDS,
  computeDecaysAt,
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
  type TimeBand,
} from "@testslot/shared";
import type { DataStore } from "./store";

/** Shape of a centre with no durable status row yet (matches an empty compute). */
const EMPTY_STATUS: CentreStatusResult = {
  status: "unclear",
  confidence: 0,
  metrics: {
    availabilityReports24h: 0,
    uniqueReporters24h: 0,
    noTestReports3d: 0,
    lastReportAt: null,
    totalReports7d: 0,
  },
};

interface ReportRow {
  id: string;
  centre_slug: string;
  user_id: string;
  report_type: AvailabilityReport["type"];
  checked_at: string;
  earliest_month: string | null;
  time_band: AvailabilityReport["timeBand"] | null;
  confidence: number;
  note: string | null;
  created_at: string;
  decays_at: string | null;
}

function mapReport(r: ReportRow): AvailabilityReport {
  return {
    id: r.id,
    centreSlug: r.centre_slug,
    userId: r.user_id,
    type: r.report_type,
    checkedAt: r.checked_at,
    earliestMonth: r.earliest_month ?? undefined,
    timeBand: r.time_band ?? undefined,
    confidence: r.confidence,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  };
}

interface CentreStatusRow {
  centre_slug: string;
  status: CentreStatusResult["status"];
  confidence: number;
  metrics: CentreStatusResult["metrics"];
}

function mapStatus(r: CentreStatusRow): CentreStatusResult {
  return { status: r.status, confidence: r.confidence, metrics: r.metrics };
}

interface HeatmapCellRow {
  dow: number;
  time_band: string;
  report_count: number;
}

function mapCancellation(r: Record<string, unknown>): CancellationPost {
  return {
    id: String(r.id),
    centreSlug: String(r.centre_slug),
    userId: String(r.user_id),
    authorName: String(r.author_name),
    isInstructor: Boolean(r.is_instructor),
    plannedCancelAt: String(r.planned_cancel_at),
    testMonth: (r.test_month as string) ?? undefined,
    note: (r.note as string) ?? undefined,
    status: r.status as CancellationPost["status"],
    moderationStatus: r.moderation_status as CancellationPost["moderationStatus"],
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
  };
}

/**
 * Builds a DataStore over a Supabase client + query builder. Pass a session
 * client (RLS enforced via the user's JWT) for user-facing work, or the
 * service-role client (bypasses RLS) for admin/moderation.
 */
export function createSupabaseStore(client: SupabaseClient): DataStore {
  return {
    async listCentres(): Promise<TestCentre[]> {
      return TEST_CENTRES;
    },
    async getCentre(slug: string): Promise<TestCentre | undefined> {
      return getCentreBySlug(slug);
    },

    // Status + heatmap read the durable engine tables (written by pg_cron),
    // never aggregating raw reports per request (PRD §7.6, migration 0005).
    async getCentreStatus(slug: string): Promise<CentreStatusResult> {
      const { data, error } = await client
        .from("centre_status")
        .select("centre_slug, status, confidence, metrics")
        .eq("centre_slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? mapStatus(data as CentreStatusRow) : EMPTY_STATUS;
    },

    async listCentreStatuses(): Promise<Record<string, CentreStatusResult>> {
      const { data, error } = await client
        .from("centre_status")
        .select("centre_slug, status, confidence, metrics");
      if (error) throw error;
      const byCentre = new Map<string, CentreStatusResult>();
      for (const row of data as CentreStatusRow[]) {
        byCentre.set(row.centre_slug, mapStatus(row));
      }
      const out: Record<string, CentreStatusResult> = {};
      for (const centre of TEST_CENTRES) {
        out[centre.slug] = byCentre.get(centre.slug) ?? EMPTY_STATUS;
      }
      return out;
    },

    async getHeatmap(slug: string): Promise<HeatmapResult> {
      const { data, error } = await client
        .from("centre_heatmap")
        .select("dow, time_band, report_count")
        .eq("centre_slug", slug);
      if (error) throw error;

      const counts = new Map<string, number>();
      let max = 0;
      for (const row of data as HeatmapCellRow[]) {
        if (!TIME_BANDS.includes(row.time_band as TimeBand)) continue;
        const key = `${row.dow}:${row.time_band}`;
        const next = (counts.get(key) ?? 0) + row.report_count;
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
    },

    async listReports(slug: string, limit = 20): Promise<AvailabilityReport[]> {
      const { data, error } = await client
        .from("availability_reports")
        .select("*")
        .eq("centre_slug", slug)
        .order("checked_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as ReportRow[]).map(mapReport);
    },

    async createReport(input: ReportInput, userId: string): Promise<AvailabilityReport> {
      const now = new Date().toISOString();
      const row: ReportRow = {
        id: randomUUID(),
        user_id: userId,
        centre_slug: input.centreSlug,
        report_type: input.type,
        checked_at: now,
        earliest_month: input.earliestMonth ?? null,
        time_band: input.timeBand ?? null,
        confidence: 60,
        note: input.note ?? null,
        created_at: now,
        decays_at: computeDecaysAt(input.type, now),
      };
      const { error } = await client.from("availability_reports").insert(row);
      if (error) throw error;
      return mapReport(row);
    },

    async confirmReport(reportId: string, userId: string, agrees: boolean): Promise<void> {
      const { error } = await client
        .from("report_confirmations")
        .upsert(
          { report_id: reportId, user_id: userId, agrees },
          { onConflict: "report_id,user_id" },
        );
      if (error) throw error;
    },

    async getUserConfirmations(
      userId: string,
      reportIds: string[],
    ): Promise<Record<string, boolean>> {
      if (reportIds.length === 0) return {};
      const { data, error } = await client
        .from("report_confirmations")
        .select("report_id, agrees")
        .eq("user_id", userId)
        .in("report_id", reportIds);
      if (error) throw error;
      const out: Record<string, boolean> = {};
      for (const row of data as { report_id: string; agrees: boolean }[]) {
        out[row.report_id] = row.agrees;
      }
      return out;
    },

    async listFollows(userId: string): Promise<string[]> {
      const { data, error } = await client
        .from("user_centres")
        .select("centre_slug")
        .eq("user_id", userId);
      if (error) throw error;
      return (data as { centre_slug: string }[]).map((r) => r.centre_slug);
    },
    async follow(userId: string, slug: string): Promise<void> {
      const { error } = await client
        .from("user_centres")
        .upsert(
          { user_id: userId, centre_slug: slug },
          { onConflict: "user_id,centre_slug", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    async unfollow(userId: string, slug: string): Promise<void> {
      const { error } = await client
        .from("user_centres")
        .delete()
        .eq("user_id", userId)
        .eq("centre_slug", slug);
      if (error) throw error;
    },

    async getReminderPreferences(userId: string): Promise<ReminderPreferences> {
      const { data, error } = await client
        .from("reminder_preferences")
        .select("times, timezone, enabled, channels")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          times: DEFAULT_REMINDER_TIMES,
          timezone: DEFAULT_TIMEZONE,
          enabled: true,
          channels: ["web_push"],
        };
      }
      return data as ReminderPreferences;
    },

    async saveReminderPreferences(
      userId: string,
      input: { times: string[]; enabled: boolean },
    ): Promise<ReminderPreferences> {
      const prefs = {
        user_id: userId,
        times: normaliseReminderTimes(input.times),
        enabled: input.enabled,
        timezone: DEFAULT_TIMEZONE,
        channels: ["web_push"],
        updated_at: new Date().toISOString(),
      };
      const { error } = await client
        .from("reminder_preferences")
        .upsert(prefs, { onConflict: "user_id" });
      if (error) throw error;
      return {
        times: prefs.times,
        timezone: prefs.timezone,
        enabled: prefs.enabled,
        channels: prefs.channels,
      };
    },

    async saveDeviceToken(
      userId: string,
      subscription: unknown,
      endpoint: string,
    ): Promise<void> {
      const { error } = await client.from("device_tokens").upsert(
        {
          user_id: userId,
          subscription,
          endpoint,
          platform: "web",
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" },
      );
      if (error) throw error;
    },

    async listCancellations(slug?: string): Promise<CancellationPost[]> {
      let query = client
        .from("cancellation_posts")
        .select("*")
        .eq("moderation_status", "approved")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("planned_cancel_at", { ascending: true });
      if (slug) query = query.eq("centre_slug", slug);
      const { data, error } = await query;
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapCancellation);
    },

    async createCancellation(
      input: CancellationInput,
      user: { id: string; name: string; isInstructor: boolean },
    ): Promise<{ post: CancellationPost; flagged: boolean }> {
      const { flagged } = screenForScam(input.note ?? "");
      const now = new Date();
      const row = {
        id: randomUUID(),
        user_id: user.id,
        centre_slug: input.centreSlug,
        author_name: user.name,
        is_instructor: user.isInstructor,
        planned_cancel_at: input.plannedCancelAt,
        test_month: input.testMonth ?? null,
        note: input.note ?? null,
        status: "active",
        moderation_status: flagged ? "pending" : "approved",
        created_at: now.toISOString(),
        expires_at: new Date(new Date(input.plannedCancelAt).getTime() + 60 * 60_000).toISOString(),
      };
      const { error } = await client.from("cancellation_posts").insert(row);
      if (error) throw error;
      return { post: mapCancellation(row), flagged };
    },

    async listPendingCancellations(): Promise<CancellationPost[]> {
      const { data, error } = await client
        .from("cancellation_posts")
        .select("*")
        .eq("moderation_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapCancellation);
    },

    async setCancellationModeration(
      id: string,
      status: "approved" | "rejected",
    ): Promise<void> {
      const { error } = await client
        .from("cancellation_posts")
        .update({ moderation_status: status })
        .eq("id", id);
      if (error) throw error;
    },
  };
}
