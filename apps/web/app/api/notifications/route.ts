import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { getUserNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const notifications = await getUserNotifications(getServiceStore(), user.id);
  return NextResponse.json({ notifications });
}
