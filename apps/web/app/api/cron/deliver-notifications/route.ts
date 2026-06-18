import { NextResponse } from "next/server";
import { getCentreBySlug } from "@testslot/shared";
import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { isEmailConfigured, sendEmail } from "@/lib/email/resend";
import { formatDateTime } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Look-back window per run; should comfortably exceed the cron interval so no
// freshly-approved post is missed between runs.
const LOOKBACK_MINUTES = 30;
const GOVUK_URL =
  process.env.NEXT_PUBLIC_GOVUK_BOOKING_URL ?? "https://www.gov.uk/book-driving-test";

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
    .select("id, centre_slug, is_instructor, planned_cancel_at, created_at")
    .eq("moderation_status", "approved")
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .gte("created_at", sinceIso);
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

      // Dedupe: the unique index (user_id, cancellation_post_id, channel) turns
      // a repeat insert into error code 23505, which we treat as "already sent".
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
        })
        .select("id")
        .maybeSingle();
      if (insErr || !inserted?.id) {
        skipped += 1; // unique violation (already delivered) or insert failure
        continue;
      }
      const deliveryId = String(inserted.id);
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

      const result = await sendEmail({
        to: email,
        subject: title,
        html: `<p>${body}</p><p><a href="${GOVUK_URL}">Check availability on GOV.UK</a></p>`,
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
