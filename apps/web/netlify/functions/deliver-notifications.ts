// Netlify Scheduled Function (Chunk B) — thin cron trigger.
//
// All delivery logic lives in the Next route /api/cron/deliver-notifications so
// it shares the app's Supabase + Resend config; this function just pings it on a
// schedule with the shared secret. Inert until URL + CRON_SECRET are set.
//
// Discovered automatically by Netlify at <base>/netlify/functions (base=apps/web).
// Schedule is declared via the exported `config` below — no netlify.toml entry needed.

export default async () => {
  const base = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!base || !secret) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "URL or CRON_SECRET not set" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  const res = await fetch(`${base}/api/cron/deliver-notifications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text().catch(() => "");
  return new Response(text || JSON.stringify({ ok: res.ok }), {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
};

// Every 15 minutes. Adjust to taste; keep LOOKBACK_MINUTES in the route >= this.
export const config = { schedule: "*/15 * * * *" };
