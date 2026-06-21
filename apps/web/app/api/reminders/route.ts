import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_REMINDER_TIMES, isValidReminderTime } from "@testslot/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { captureServer } from "@/lib/analytics/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const prefs = await getStore().getReminderPreferences(user.id);
  return NextResponse.json({ prefs });
}

const putSchema = z.object({
  times: z
    .array(z.string().refine(isValidReminderTime, "Use HH:MM (24-hour)."))
    .max(MAX_REMINDER_TIMES, `At most ${MAX_REMINDER_TIMES} times.`),
  enabled: z.boolean(),
});

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check your reminder times.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const prefs = await getStore().saveReminderPreferences(user.id, parsed.data);
  await captureServer("reminder_saved", user.id, {
    enabled: parsed.data.enabled,
    times: parsed.data.times.length,
  });
  return NextResponse.json({ ok: true, prefs });
}
