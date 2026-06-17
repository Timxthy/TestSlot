import { NextResponse } from "next/server";
import { reportInputSchema } from "@testslot/shared";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";

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

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const store = getStore();
  const report = await store.createReport(parsed.data, user.id);
  return NextResponse.json({ ok: true, report }, { status: 201 });
}
