import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { auditLog } from "@/lib/audit";
import { captureServer } from "@/lib/analytics/server";

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

  if (SUPABASE_ENABLED) {
    // Delete the auth identity FIRST. profiles.id → auth.users ON DELETE CASCADE
    // removes the profile (which SET-NULLs availability_reports.user_id, keeping
    // reports anonymised) and cascades follows / confirmations / prefs / tokens /
    // deliveries / cancellations. It also invalidates the user's sessions
    // everywhere. If this fails we must NOT report success — nothing is half-done
    // because the cascade is atomic with the auth-user delete.
    const { error } = await getAdminClient().auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json(
        { error: "Couldn't fully delete your account. Please try again." },
        { status: 500 },
      );
    }
    // Clear the now-orphaned session cookie on this device.
    await createSupabaseServerClient()
      .auth.signOut()
      .catch(() => {});
  } else {
    // Mock mode: anonymise authorship + drop PII in the in-memory store.
    await getServiceStore().deleteUserData(user.id);
  }

  // actorId stays null — the profile is gone and can't be referenced.
  await auditLog({
    action: "account_deleted",
    targetType: "profile",
    targetId: user.id,
    metadata: { self: true },
  });
  await captureServer("account_deleted", user.id, { self: true });

  return NextResponse.json({ ok: true });
}
