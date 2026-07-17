import { NextResponse } from "next/server";
import {
  getCentreBySlug,
  shouldDelayDelivery,
} from "@testslot/shared";
import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { isEmailConfigured, sendEmail } from "@/lib/email/resend";
import { signUnsubscribe } from "@/lib/unsubscribe";
import { formatDateTime } from "@/lib/format";
import { shouldConsiderCancellationForDelivery } from "@/lib/notifications/selection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOVUK_URL =
  process.env.NEXT_PUBLIC_GOVUK_BOOKING_URL ?? "https://www.gov.uk/book-driving-test";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://testslotr.netlify.app";

/** Only the scheduler, holding CRON_SECRET, may trigger delivery. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Notification delivery worker (Chunk B). Invoked by the Netlify Scheduled
 * Function. Finds newly approved+active cancellation posts, emails the centre's
 * opted-in followers, and records each send in notification_deliveries (the
 * unique dedupe index makes re-runs idempotent).
 *
 * COMPLIANCE: triggers only on user-submitted, moderated community posts —
 * never on DVSA scanning. Inert (safe no-op) until Supabase + Resend are set
 * and migration 0003 is applied.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!SUPABASE_ENABLED || !isEmailConfigured()) {
    return NextResponse.json(
      {
        skipped: true,
        reason: !SUPABASE_ENABLED ? "Supabase not configured." : "RESEND_API_KEY not set.",
      },
      { status: 200 },
    );
  }

  const admin = getAdminClient();
  const nowIso = new Date().toISOString();

  const { data: posts, error: postsErr } = await admin
    .from("cancellation_posts")
    .select(
      "id, centre_slug, is_instructor, planned_cancel_at, approved_at, moderation_status, status, expires_at",
    )
    .eq("moderation_status", "approved")
    .eq("status", "active")
    .gt("expires_at", nowIso)
    // No short lookback: notification_deliveries is the durable idempotency
    // record, so old active posts still get picked up after cron/email outages.
    .not("approved_at", "is", null);
  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 });
  }

  let queued = 0;
  let sent = 0;
  let skipped = 0;

  for (const post of posts ?? []) {
    if (
      !shouldConsiderCancellationForDelivery({
        moderationStatus: String(post.moderation_status),
        status: String(post.status),
        expiresAt: String(post.expires_at),
        now: nowIso,
      })
    ) {
      continue;
    }

    const centre = getCentreBySlug(String(post.centre_slug));
    if (!centre) continue;

    const { data: follows, error: followErr } = await admin
      .from("user_centres")
      .select("user_id")
      .eq("centre_slug", post.centre_slug)
      .eq("notification_enabled", true);
    if (followErr) continue;

    const title = `${centre.name}: planned cancellation`;
    const body = `${post.is_instructor ? "A verified instructor" : "A learner"} plans to cancel around ${formatDateTime(
      String(post.planned_cancel_at),
    )}. No slot is guaranteed — check and book on GOV.UK yourself.`;

    // Recipient tiers, for the free-delay vs premium-instant throttle.
    const followerIds = (follows ?? []).map((f) => String(f.user_id));
    const tierByUser = new Map<string, string>();
    if (followerIds.length > 0) {
      const { data: subs } = await admin
        .from("subscriptions")
        .select("user_id, tier, status")
        .in("user_id", followerIds);
      for (const s of subs ?? []) {
        if (s.status === "active") tierByUser.set(String(s.user_id), String(s.tier));
      }
    }
    const postAgeMin = post.approved_at
      ? (Date.now() - new Date(String(post.approved_at)).getTime()) / 60_000
      : Number.POSITIVE_INFINITY;

    for (const follow of follows ?? []) {
      const userId = String(follow.user_id);

      // Tier throttle: free recipients wait until the post is past the delay
      // window; premium/instructor — and any instructor-authored post — are
      // instant. The next cron run delivers held posts once they're old enough.
      if (
        shouldDelayDelivery(
          tierByUser.get(userId) ?? "free",
          postAgeMin,
          Boolean(post.is_instructor),
        )
      ) {
        skipped += 1;
        continue;
      }

      // The database function atomically inserts or reclaims this delivery. A
      // concurrent worker gets no row, and pending work is reclaimed only after
      // its lease is stale.
      const { data: claimedRows, error: claimError } = await admin.rpc(
        "claim_notification_delivery",
        {
          p_user_id: userId,
          p_centre_slug: String(post.centre_slug),
          p_cancellation_post_id: String(post.id),
          p_channel: "email",
          p_title: title,
          p_body: body,
          p_now: nowIso,
        },
      );
      if (claimError) {
        return NextResponse.json(
          { error: "Could not claim notification delivery." },
          { status: 500 },
        );
      }
      const claim = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;
      if (!claim?.delivery_id) {
        skipped += 1;
        continue;
      }

      const deliveryId = String(claim.delivery_id);
      const deliveryTitle = String(claim.delivery_title);
      const deliveryBody = String(claim.delivery_body);
      queued += 1;

      const { data: userRes } = await admin.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (!email) {
        await admin
          .from("notification_deliveries")
          .update({ status: "skipped", error: "no email on account" })
          .eq("id", deliveryId);
        skipped += 1;
        continue;
      }

      const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?u=${encodeURIComponent(signUnsubscribe(userId))}`;
      const result = await sendEmail({
        to: email,
        subject: deliveryTitle,
        idempotencyKey: `cancellation-email/${deliveryId}`,
        html:
          `<p>${deliveryBody}</p>` +
          `<p><a href="${GOVUK_URL}">Check availability on GOV.UK</a></p>` +
          `<hr><p style="font-size:12px;color:#64748b">You’re receiving this because you follow ${centre.name} ` +
          `on TestSlot Radar. <a href="${unsubscribeUrl}">Unsubscribe from notification emails</a>.</p>`,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      await admin
        .from("notification_deliveries")
        .update(
          result.ok
            ? { status: "sent", sent_at: new Date().toISOString() }
            : { status: "failed", error: result.error },
        )
        .eq("id", deliveryId);

      if (result.ok) sent += 1;
    }
  }

  return NextResponse.json({ ok: true, posts: posts?.length ?? 0, queued, sent, skipped });
}
