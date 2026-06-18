import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TEST_CENTRES,
  computeCentreStatus,
  computeDecaysAt,
  computeHeatmap,
  getCentreBySlug,
  screenForScam,
  type AvailabilityReport,
  type CancellationInput,
  type CancellationPost,
  type CentreStatusResult,
  type HeatmapResult,
  type ReportInput,
  type TestCentre,
} from "@testslot/shared";
import type { DataStore } from "./store";

const DAY = 86_400_000;

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
  async function reportsSince(slug: string, sinceMs: number): Promise<AvailabilityReport[]> {
    const since = new Date(Date.now() - sinceMs).toISOString();
    const { data, error } = await client
      .from("availability_reports")
      .select("*")
      .eq("centre_slug", slug)
      .gte("checked_at", since)
      .order("checked_at", { ascending: false });
    if (error) throw error;
    return (data as ReportRow[]).map(mapReport);
  }

  return {
    async listCentres(): Promise<TestCentre[]> {
      return TEST_CENTRES;
    },
    async getCentre(slug: string): Promise<TestCentre | undefined> {
      return getCentreBySlug(slug);
    },

    async getCentreStatus(slug: string): Promise<CentreStatusResult> {
      return computeCentreStatus(await reportsSince(slug, 7 * DAY));
    },

    async listCentreStatuses(): Promise<Record<string, CentreStatusResult>> {
      const since = new Date(Date.now() - 7 * DAY).toISOString();
      const { data, error } = await client
        .from("availability_reports")
        .select("*")
        .gte("checked_at", since);
      if (error) throw error;
      const byCentre = new Map<string, AvailabilityReport[]>();
      for (const r of (data as ReportRow[]).map(mapReport)) {
        const list = byCentre.get(r.centreSlug) ?? [];
        list.push(r);
        byCentre.set(r.centreSlug, list);
      }
      const out: Record<string, CentreStatusResult> = {};
      for (const centre of TEST_CENTRES) {
        out[centre.slug] = computeCentreStatus(byCentre.get(centre.slug) ?? []);
      }
      return out;
    },

    async getHeatmap(slug: string): Promise<HeatmapResult> {
      return computeHeatmap(await reportsSince(slug, 14 * DAY));
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
