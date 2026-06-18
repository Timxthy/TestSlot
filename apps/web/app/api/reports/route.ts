import { NextResponse } from "next/server";
import { reportInputSchema, screenForScam } from "@testslot/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const parsed = reportInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Notes must not carry scam/broker language (parity with the cancellation board).
  if (parsed.data.note && screenForScam(parsed.data.note).flagged) {
    return NextResponse.json(
      { error: "That note looks like it mentions payment or personal details. Please remove it." },
      { status: 422 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const limited = await checkRateLimit(user.id, "availability_reports");
  if (limited) {
    return NextResponse.json({ error: limited }, { status: 429 });
  }

  const store = getStore();
  const report = await store.createReport(parsed.data, user.id);
  return NextResponse.json({ ok: true, report }, { status: 201 });
}
