import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turn off all notification emails for the user encoded in the token. */
async function unsubscribe(token: string): Promise<"ok" | "invalid" | "error"> {
  const userId = verifyUnsubscribe(token);
  if (!userId) return "invalid";
  if (!SUPABASE_ENABLED) return "ok"; // mock mode: nothing to write
  const { error } = await getAdminClient()
    .from("user_centres")
    .update({ notification_enabled: false })
    .eq("user_id", userId);
  return error ? "error" : "ok";
}

function html(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
      `<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;color:#0f172a;line-height:1.6}a{color:#2563eb}</style>` +
      `</head><body><h1>${title}</h1><p>${body}</p><p><a href="/">Back to TestSlot Radar</a></p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

// Human click from the email.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("u") ?? "";
  const result = await unsubscribe(token);
  if (result === "invalid")
    return html("Invalid link", "This unsubscribe link is invalid or has expired.", 400);
  if (result === "error")
    return html("Something went wrong", "Please try again in a moment.", 500);
  return html(
    "Unsubscribed",
    "You won’t receive any more TestSlot Radar notification emails. You can turn them back on per centre anytime from your dashboard.",
  );
}

// RFC 8058 one-click unsubscribe (email clients POST here automatically).
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("u") ?? "";
  const result = await unsubscribe(token);
  const status = result === "ok" ? 200 : result === "invalid" ? 400 : 500;
  return NextResponse.json({ ok: result === "ok" }, { status });
}
