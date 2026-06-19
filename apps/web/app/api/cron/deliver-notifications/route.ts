import { NextResponse } from "next/server";
import { type DeliveryStatus, decideDelivery, getCentreBySlug } from "@testslot/shared";
import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { isEmailConfigured, sendEmail } from "@/lib/email/resend";
import { signUnsubscribe } from "@/lib/unsubscribe";
import { formatDateTime } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Look-back window per run; should comfortably exceed the cron interval so no
// freshly-approved post is missed between runs.
const LOOKBACK_MINUTES = 30;
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
  const sinceIso = new Date(Date.now() - LOOKBACK_MINUTES * 60_000).toISOString();

  const { data: posts, error: postsErr } = await admin
    .from("cancellation_posts")
    .select("id, centre_slug, is_instructor, planned_cancel_at, approved_at")
    .eq("moderation_status", "approved")
    .eq("status", "active")
    .gt("expires_at", nowIso)
    // Filter on approval time, not creation time, so posts approved by a
    // moderator long after they were created still get delivered.
    .gte("approved_at", sinceIso);
  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 });
  }

  let queued = 0;
  let sent = 0;
  let skipped = 0;

  for (const post of posts ?? []) {
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

    for (const follow of follows ?? []) {
      const userId = String(follow.user_id);

      // Look at any prior delivery for this (user, post, email) to decide whether
      // to send fresh, retry a failed one, or skip an already-sent one.
      const { data: existing } = await admin
        .from("notification_deliveries")
        .select("id, status, attempts")
        .eq("user_id", userId)
        .eq("cancellation_post_id", post.id)
        .eq("channel", "email")
        .maybeSingle();

      const decision = decideDelivery(
        existing
          ? { status: existing.status as DeliveryStatus, attempts: Number(existing.attempts) }
          : null,
      );
      if (decision === "skip") {
        skipped += 1;
        continue;
      }

      let deliveryId: string;
      if (decision === "retry") {
        deliveryId = String(existing!.id);
        await admin
          .from("notification_deliveries")
          .update({ status: "pending", attempts: Number(existing!.attempts) + 1, error: null })
          .eq("id", deliveryId);
      } else {
        // send_new. A concurrent run may have inserted first (unique index) — if
        // so the insert fails and we skip, letting that run own the delivery.
        const { data: inserted, error: insErr } = await admin
          .from("notification_deliveries")
          .insert({
            user_id: userId,
            centre_slug: post.centre_slug,
            cancellation_post_id: post.id,
            channel: "email",
            status: "pending",
            title,
            body,
            attempts: 1,
          })
          .select("id")
          .maybeSingle();
        if (insErr || !inserted?.id) {
          skipped += 1;
          continue;
        }
        deliveryId = String(inserted.id);
      }
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
        subject: title,
        html:
          `<p>${body}</p>` +
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
