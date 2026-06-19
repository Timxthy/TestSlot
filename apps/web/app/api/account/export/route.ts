import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";

export const runtime = "nodejs";

/**
 * GDPR DSAR export. Returns everything we hold about the signed-in user as a
 * downloadable JSON file. Reads via the service store but is strictly scoped to
 * the authenticated user's own id.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const data = await getServiceStore().exportUserData(user.id);

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="testslot-radar-data.json"`,
    },
  });
}
