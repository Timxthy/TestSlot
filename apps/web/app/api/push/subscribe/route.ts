import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedPushEndpoint } from "@testslot/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";

export const runtime = "nodejs";

// The shape of a browser PushSubscription (subset we persist).
const schema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.union([z.number(), z.null()]).optional(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 422 });
  }

  // SSRF guard: the reminder cron sends server-side requests to this endpoint, so
  // only accept HTTPS URLs on a known browser push service.
  if (!isAllowedPushEndpoint(parsed.data.endpoint)) {
    return NextResponse.json({ error: "Unsupported push endpoint." }, { status: 422 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await getStore().saveDeviceToken(user.id, parsed.data, parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
