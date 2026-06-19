export type NotificationType =
  | "activity_spike"
  | "recently_active"
  | "nearby_active"
  | "cancellation";

export interface AppNotification {
  id: string;
  type: NotificationType;
  centreSlug: string;
  title: string;
  body: string;
  tone: "good" | "neutral" | "warn";
  /** ISO timestamp of the most recent relevant event. */
  createdAt: string;
}

/** Delivery statuses recorded in notification_deliveries. */
export type DeliveryStatus = "pending" | "sent" | "failed" | "skipped";

/** Max attempts before the dispatcher gives up retrying a failed delivery. */
export const MAX_DELIVERY_ATTEMPTS = 3;

export type DeliveryDecision = "send_new" | "retry" | "skip";

/**
 * Decides what the delivery cron should do for a (user, post, channel) given the
 * existing delivery row (or null if none). Lets failed sends be retried up to the
 * cap while never re-sending an already-`sent` notification.
 */
export function decideDelivery(
  existing: { status: DeliveryStatus; attempts: number } | null,
  maxAttempts: number = MAX_DELIVERY_ATTEMPTS,
): DeliveryDecision {
  if (!existing) return "send_new";
  if (existing.status === "sent") return "skip";
  if (existing.attempts >= maxAttempts) return "skip";
  return "retry";
}
