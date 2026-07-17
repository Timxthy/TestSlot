import { NextResponse } from "next/server";
import { cancellationInputSchema } from "@testslot/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordContentFlag } from "@/lib/audit";
import { captureServer } from "@/lib/analytics/server";
import { isDailyLimitError } from "@/lib/db/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const parsed = cancellationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const limited = await checkRateLimit(user.id, "cancellation_posts");
  if (limited) {
    return NextResponse.json({ error: limited }, { status: 429 });
  }
  const store = getStore();
  let created;
  try {
    created = await store.createCancellation(parsed.data, {
      id: user.id,
      name: user.name,
      isInstructor: user.isInstructor,
    });
  } catch (err) {
    if (isDailyLimitError(err)) {
      return NextResponse.json(
        { error: "Daily limit reached. Please try again tomorrow." },
        { status: 429 },
      );
    }
    throw err;
  }
  const { post, flagged } = created;
  if (flagged) {
    await recordContentFlag({
      contentType: "cancellation_post",
      contentId: post.id,
      ruleMatched: "scam phrase",
      severity: "medium",
      autoAction: "pending_review",
    });
    await captureServer("cancellation_routed_to_moderation", user.id, {
      centre: parsed.data.centreSlug,
    });
  }
  await captureServer("cancellation_posted", user.id, {
    centre: parsed.data.centreSlug,
    flagged,
  });
  return NextResponse.json({ ok: true, flagged }, { status: 201 });
}
