import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * GDPR erasure. Anonymises the user's authorship (their reports survive, so
 * centre status/heatmap are unaffected) and deletes their PII + account. The
 * deletion event is recorded in the append-only audit log.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Delete the profile row: SET-NULLs availability_reports.user_id and cascades
  // follows / confirmations / reminder prefs / device tokens / deliveries /
  // cancellations.
  await getServiceStore().deleteUserData(user.id);

  if (SUPABASE_ENABLED) {
    // Remove the auth identity (email, etc.).
    await getAdminClient().auth.admin.deleteUser(user.id);
    // Clear the now-orphaned session cookie.
    await createSupabaseServerClient()
      .auth.signOut()
      .catch(() => {});
  }

  // actorId stays null — the profile is gone and can't be referenced.
  await auditLog({
    action: "account_deleted",
    targetType: "profile",
    targetId: user.id,
    metadata: { self: true },
  });

  return NextResponse.json({ ok: true });
}
