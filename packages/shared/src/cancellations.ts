import { z } from "zod";

export interface CancellationPost {
  id: string;
  centreSlug: string;
  userId: string;
  authorName: string;
  isInstructor: boolean;
  /** When the author plans to cancel (ISO). */
  plannedCancelAt: string;
  testMonth?: string;
  note?: string;
  status: "active" | "expired" | "removed";
  moderationStatus: "approved" | "pending" | "rejected";
  createdAt: string;
  expiresAt: string;
}

/** Anti-broker confirmations are required to post (PRD §11.1 Story 5). */
export const cancellationInputSchema = z.object({
  centreSlug: z.string().min(1, "Choose a centre."),
  plannedCancelAt: z.string().min(1, "When do you plan to cancel?"),
  testMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  note: z.string().max(280, "Keep notes under 280 characters.").optional(),
  noPayment: z.literal(true, {
    errorMap: () => ({ message: "You must agree not to ask for payment." }),
  }),
  noPersonalDetails: z.literal(true, {
    errorMap: () => ({ message: "You must agree not to ask for personal details." }),
  }),
  understandsSelfBooking: z.literal(true, {
    errorMap: () => ({ message: "You must confirm others book on GOV.UK themselves." }),
  }),
});
export type CancellationInput = z.infer<typeof cancellationInputSchema>;

/**
 * Scam trigger phrases (PRD §13.7). Posts matching these are routed to the
 * moderation queue before publishing. Lives in shared data, not page source.
 */
export const SCAM_TRIGGER_PATTERNS: string[] = [
  "pay me",
  "£",
  "\\$",
  "deposit",
  "transfer fee",
  "dm to buy",
  "dm me",
  "whatsapp",
  "i can book",
  "i'll book",
  "ill book",
  "auto book",
  "guaranteed slot",
  "send licence",
  "licence number",
  "theory pass",
  "booking reference",
  "cash",
  "paypal",
];

export function screenForScam(text: string): { flagged: boolean; matched: string[] } {
  const lower = text.toLowerCase();
  const matched = SCAM_TRIGGER_PATTERNS.filter((p) => {
    try {
      return new RegExp(p).test(lower);
    } catch {
      return lower.includes(p);
    }
  });
  return { flagged: matched.length > 0, matched };
}
