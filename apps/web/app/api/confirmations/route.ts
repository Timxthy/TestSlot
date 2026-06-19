import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";

export const runtime = "nodejs";

const schema = z.object({
  reportId: z.string().min(1),
  agrees: z.boolean(),
});

/** Records a user's "still there / not there" confirmation on a report. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid confirmation." }, { status: 422 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // getStore() is the session-scoped client, so RLS enforces insert/update-own.
  const store = getStore();
  await store.confirmReport(parsed.data.reportId, user.id, parsed.data.agrees);
  return NextResponse.json({ ok: true });
}
