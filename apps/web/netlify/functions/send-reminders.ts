// Netlify Scheduled Function — thin cron trigger for manual reminders.
//
// Mirrors deliver-notifications: all logic lives in /api/cron/send-reminders so
// it shares the app's Supabase + VAPID config; this just pings it on a schedule
// with the shared secret. Inert until URL + CRON_SECRET are set.

export default async () => {
  const base = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!base || !secret) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "URL or CRON_SECRET not set" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  const res = await fetch(`${base}/api/cron/send-reminders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text().catch(() => "");
  return new Response(text || JSON.stringify({ ok: res.ok }), {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
};

// Every 15 minutes; keep REMINDER_WINDOW_MINUTES >= this so no slot is missed.
export const config = { schedule: "*/15 * * * *" };
