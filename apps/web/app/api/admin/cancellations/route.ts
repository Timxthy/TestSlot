import { NextResponse } from "next/server";
import { getAdminStore } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const store = getAdminStore();
  await store.setCancellationModeration(id, action === "approve" ? "approved" : "rejected");
  return NextResponse.json({ ok: true });
}
