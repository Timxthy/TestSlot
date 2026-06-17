import {
  AVAILABILITY_TYPES,
  getCentreBySlug,
  getNearbyCentres,
  type AppNotification,
} from "@testslot/shared";
import type { DataStore } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function withinHours(iso: string, hours: number): boolean {
  return Date.now() - new Date(iso).getTime() <= hours * 3_600_000;
}

/**
 * Derives community-activity notifications for a user's followed centres from
 * existing data (statuses, recent reports, cancellations). Store-agnostic, so it
 * works against both the mock and Supabase adapters. Reusable for push later.
 */
export async function getUserNotifications(
  store: DataStore,
  userId: string,
): Promise<AppNotification[]> {
  const follows = await store.listFollows(userId);
  if (follows.length === 0) return [];

  const statuses = await store.listCentreStatuses();
  const out: AppNotification[] = [];

  // Activity on followed centres.
  for (const slug of follows) {
    const centre = getCentreBySlug(slug);
    const st = statuses[slug];
    if (!centre || !st) continue;
    if (st.status === "active_now" || st.status === "recently_active") {
      const reports = await store.listReports(slug, 40);
      const recent = reports.filter(
        (r) => AVAILABILITY_TYPES.includes(r.type) && withinHours(r.checkedAt, 24),
      );
      if (recent.length > 0) {
        out.push({
          id: `act-${slug}-${recent[0].checkedAt}`,
          type: st.status === "active_now" ? "activity_spike" : "recently_active",
          centreSlug: slug,
          title: `${centre.name}: ${st.status === "active_now" ? "active now" : "recently active"}`,
          body: `${recent.length} availability report${recent.length === 1 ? "" : "s"} in the last 24h. Check GOV.UK yourself if this centre works for you.`,
          tone: "good",
          createdAt: recent[0].checkedAt,
        });
      }
    }
  }

  // Cancellations on followed centres.
  for (const slug of follows) {
    const centre = getCentreBySlug(slug);
    if (!centre) continue;
    for (const p of await store.listCancellations(slug)) {
      out.push({
        id: `cancel-${p.id}`,
        type: "cancellation",
        centreSlug: slug,
        title: `${centre.name}: planned cancellation`,
        body: `${p.isInstructor ? "A verified instructor" : "A learner"} plans to cancel around ${formatDateTime(p.plannedCancelAt)}. No slot is guaranteed — book on GOV.UK yourself.`,
        tone: "neutral",
        createdAt: p.createdAt,
      });
    }
  }

  // Nearby centres that are active now (and not already followed).
  const seen = new Set<string>();
  for (const slug of follows) {
    const centre = getCentreBySlug(slug);
    if (!centre) continue;
    for (const nb of getNearbyCentres(centre)) {
      if (follows.includes(nb.slug) || seen.has(nb.slug)) continue;
      const nst = statuses[nb.slug];
      if (nst?.status === "active_now") {
        seen.add(nb.slug);
        out.push({
          id: `near-${nb.slug}`,
          type: "nearby_active",
          centreSlug: nb.slug,
          title: `Nearby: ${nb.name} is active now`,
          body: `${nb.name} (near ${centre.name}) has fresh availability reports. Check GOV.UK yourself.`,
          tone: "good",
          createdAt: nst.metrics.lastReportAt ?? new Date().toISOString(),
        });
      }
    }
  }

  return out
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
}
