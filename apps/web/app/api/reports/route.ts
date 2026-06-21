import { NextResponse } from "next/server";
import { gatesToModeration, reportInputSchema, screenForScam } from "@testslot/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { auditLog, recordContentFlag } from "@/lib/audit";
import { getUserTrustLevel } from "@/lib/trust";
import { captureServer } from "@/lib/analytics/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Authenticate first — an unauthenticated request must never reach the scam
  // filter (which writes content_flags via the service role) or any other work.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = reportInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Notes must not carry scam/broker language (parity with the cancellation board).
  if (parsed.data.note) {
    const scam = screenForScam(parsed.data.note);
    if (scam.flagged) {
      await recordContentFlag({
        contentType: "availability_report",
        ruleMatched: scam.matched.join(", "),
        severity: "high",
        autoAction: "blocked",
      });
      await auditLog({
        actorId: user.id,
        action: "report_scam_blocked",
        targetType: "availability_report",
        metadata: { matched: scam.matched },
      });
      await captureServer("report_scam_blocked", user.id, {
        centre: parsed.data.centreSlug,
      });
      return NextResponse.json(
        { error: "That note looks like it mentions payment or personal details. Please remove it." },
        { status: 422 },
      );
    }
  }

  const limited = await checkRateLimit(user.id, "availability_reports");
  if (limited) {
    await captureServer("report_rate_limited", user.id, {
      centre: parsed.data.centreSlug,
    });
    return NextResponse.json({ error: limited }, { status: 429 });
  }

  // Trust gate (PRD §13): banned accounts can't submit; restricted ones publish
  // but are flagged for moderation (their low trust weight already limits impact).
  const trustLevel = await getUserTrustLevel(user.id);
  if (trustLevel === "banned") {
    return NextResponse.json(
      { error: "This account can't submit reports. Contact support if you think this is wrong." },
      { status: 403 },
    );
  }

  const store = getStore();
  const report = await store.createReport(parsed.data, user.id);

  if (gatesToModeration(trustLevel)) {
    await recordContentFlag({
      contentType: "availability_report",
      contentId: report.id,
      ruleMatched: `trust:${trustLevel}`,
      severity: "medium",
      autoAction: "pending_review",
    });
    await auditLog({
      actorId: user.id,
      action: "report_gated_low_trust",
      targetType: "availability_report",
      targetId: report.id,
      metadata: { trustLevel },
    });
  }

  await captureServer("report_submitted", user.id, {
    centre: parsed.data.centreSlug,
    type: parsed.data.type,
    gated: gatesToModeration(trustLevel),
  });

  return NextResponse.json({ ok: true, report }, { status: 201 });
}
