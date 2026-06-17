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
