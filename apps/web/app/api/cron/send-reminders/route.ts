import { NextResponse } from "next/server";
import {
  REMINDER_PUSH_BODY,
  REMINDER_PUSH_TITLE,
  dueSlots,
  isAllowedPushEndpoint,
  parseHHMM,
} from "@testslot/shared";
import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { isPushConfigured, sendPush } from "@/lib/push";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://testslotr.netlify.app";

/** Only the scheduler, holding CRON_SECRET, may trigger reminders. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Current minute-of-day + ISO date in Europe/London (BST-aware). */
function londonNow(date = new Date()): { minutes: number; dateStr: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/**
 * Reminder dispatcher. Invoked by the Netlify Scheduled Function every 15 min.
 * Finds users whose local time matches a reminder slot and sends a web push
 * telling them to check GOV.UK themselves. reminder_deliveries (unique per
 * user × slot × day) makes it idempotent across runs.
 *
 * COMPLIANCE: the server matches clock times only — it never checks DVSA.
 * Inert (safe no-op) until Supabase + VAPID keys are set and 0008 is applied.
 *
 * Testing: POST ?at=HH:MM forces the "now" minute so a delivery can be verified
 * without waiting for the real slot.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!SUPABASE_ENABLED || !isPushConfigured()) {
    return NextResponse.json(
      {
        skipped: true,
        reason: !SUPABASE_ENABLED ? "Supabase not configured." : "VAPID keys not set.",
      },
      { status: 200 },
    );
  }

  const now = londonNow();
  const at = new URL(request.url).searchParams.get("at");
  const nowMinutes = at ? (parseHHMM(at) ?? now.minutes) : now.minutes;

  const admin = getAdminClient();
  const { data: prefs, error } = await admin
    .from("reminder_preferences")
    .select("user_id, times")
    .eq("enabled", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let pushed = 0;
  let skipped = 0;
  let removed = 0;

  for (const pref of prefs ?? []) {
    const due = dueSlots((pref.times as string[]) ?? [], nowMinutes);
    for (const slot of due) {
      // Idempotency: a unique violation means this slot already fired today.
      const { data: inserted, error: insErr } = await admin
        .from("reminder_deliveries")
        .insert({ user_id: pref.user_id, slot, sent_on: now.dateStr })
        .select("id")
        .maybeSingle();
      if (insErr || !inserted) {
        skipped += 1;
        continue;
      }

      const { data: tokens } = await admin
        .from("device_tokens")
        .select("subscription, endpoint")
        .eq("user_id", pref.user_id);

      let sendable = 0;
      let anySent = false;
      for (const token of tokens ?? []) {
        // SSRF guard for legacy/stale rows: never POST to a non-push-service URL,
        // even one stored before endpoint validation existed. Drop it.
        if (!isAllowedPushEndpoint(String(token.endpoint))) {
          await admin
            .from("device_tokens")
            .delete()
            .eq("user_id", pref.user_id)
            .eq("endpoint", token.endpoint);
          removed += 1;
          continue;
        }
        sendable += 1;
        const result = await sendPush(token.subscription as never, {
          title: REMINDER_PUSH_TITLE,
          body: REMINDER_PUSH_BODY,
          url: `${SITE_URL}/dashboard`,
        });
        if (result.ok) {
          pushed += 1;
          anySent = true;
        } else if (result.gone) {
          await admin
            .from("device_tokens")
            .delete()
            .eq("user_id", pref.user_id)
            .eq("endpoint", token.endpoint);
          removed += 1;
        }
      }

      // If every deliverable push failed transiently, release the slot claim so a
      // later run retries instead of suppressing the reminder for the whole day.
      if (sendable > 0 && !anySent) {
        await admin.from("reminder_deliveries").delete().eq("id", inserted.id);
        skipped += 1;
        continue;
      }

      await auditLog({
        actorId: String(pref.user_id),
        action: "reminder_sent",
        metadata: { slot, sentOn: now.dateStr },
      });
    }
  }

  return NextResponse.json({ ok: true, users: prefs?.length ?? 0, pushed, skipped, removed });
}
