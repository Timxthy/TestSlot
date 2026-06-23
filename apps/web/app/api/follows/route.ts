import { NextResponse } from "next/server";
import { entitlementsForTier } from "@testslot/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { captureServer } from "@/lib/analytics/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { slug?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { slug, action } = body;
  if (typeof slug !== "string" || (action !== "follow" && action !== "unfollow")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const store = getStore();
  if (action === "follow") {
    // Entitlement gate: cap how many centres a user can follow by tier.
    const [tier, current] = await Promise.all([
      store.getSubscriptionTier(user.id),
      store.listFollows(user.id),
    ]);
    const limit = entitlementsForTier(tier).followLimit;
    if (!current.includes(slug) && current.length >= limit) {
      return NextResponse.json(
        {
          error: `Your plan lets you follow up to ${limit} centres. Upgrade to follow more.`,
          code: "follow_limit",
        },
        { status: 403 },
      );
    }
    await store.follow(user.id, slug);
    await captureServer("centre_followed", user.id, { centre: slug });
  } else {
    await store.unfollow(user.id, slug);
    await captureServer("centre_unfollowed", user.id, { centre: slug });
  }

  return NextResponse.json({ ok: true });
}
