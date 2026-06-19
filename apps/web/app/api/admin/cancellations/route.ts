import { NextResponse } from "next/server";
import { getCurrentUser, isModerator } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { recordModerationAction } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!isModerator(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { id, action } = body;
  if (typeof id !== "string" || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const decision = action === "approve" ? "approved" : "rejected";
  const store = getServiceStore();
  await store.setCancellationModeration(id, decision);
  await recordModerationAction({
    moderatorId: user.id,
    targetType: "cancellation_post",
    targetId: id,
    action: decision,
  });
  return NextResponse.json({ ok: true });
}
