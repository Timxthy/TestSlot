import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

// Append-only audit helpers (Phase 1 Task 2). All writes go through the service
// role into the append-only tables. They are best-effort: an audit/flag write must
// never break the user action, and they no-op in mock mode.

type ModerationTarget =
  | "cancellation_post"
  | "availability_report"
  | "profile"
  | "instructor_application";

export async function recordModerationAction(input: {
  moderatorId: string;
  targetType: ModerationTarget;
  targetId: string;
  action: string;
  reason?: string;
}): Promise<void> {
  if (!SUPABASE_ENABLED) return;
  try {
    await getAdminClient().from("moderation_actions").insert({
      moderator_id: input.moderatorId,
      target_type: input.targetType,
      target_id: input.targetId,
      action: input.action,
      reason: input.reason ?? null,
    });
  } catch {
    /* best-effort */
  }
}

export async function recordContentFlag(input: {
  contentType: string;
  contentId?: string | null;
  ruleMatched?: string;
  severity?: "low" | "medium" | "high";
  autoAction?: "none" | "soft_warn" | "pending_review" | "blocked";
}): Promise<void> {
  if (!SUPABASE_ENABLED) return;
  try {
    await getAdminClient().from("content_flags").insert({
      content_type: input.contentType,
      content_id: input.contentId ?? null,
      rule_matched: input.ruleMatched ?? null,
      severity: input.severity ?? "low",
      auto_action: input.autoAction ?? "none",
    });
  } catch {
    /* best-effort */
  }
}

export async function auditLog(input: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!SUPABASE_ENABLED) return;
  try {
    await getAdminClient().from("audit_logs").insert({
      actor_id: input.actorId ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    /* best-effort */
  }
}
