import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";

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
  if (action === "follow") await store.follow(user.id, slug);
  else await store.unfollow(user.id, slug);

  return NextResponse.json({ ok: true });
}
