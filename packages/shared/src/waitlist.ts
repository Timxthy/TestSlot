import { z } from "zod";
import { ROLES } from "./types";

/**
 * Waitlist input. Deliberately minimal (UK GDPR data minimisation, PRD §14.2):
 * email + postcode outward code + optional role + explicit consent.
 * There are intentionally NO fields for licence/theory/booking/login data.
 */
export const waitlistSchema = z.object({
  email: z
    .string({ required_error: "Enter your email address." })
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
  postcodeArea: z
    .string({ required_error: "Enter your postcode area." })
    .trim()
    .toUpperCase()
    // UK outward code, e.g. HP13, SL1, RG30, W1 — area only, never a full postcode.
    .regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?$/, "Enter a postcode area, e.g. HP13."),
  role: z.enum(ROLES).optional(),
  interestedCentres: z.array(z.string()).max(10).optional(),
  consented: z.literal(true, {
    errorMap: () => ({
      message: "Please confirm you’ve read how we use your data.",
    }),
  }),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

/** A stored waitlist entry (what the persistence layer returns). */
export interface WaitlistEntry extends WaitlistInput {
  id: string;
  createdAt: string;
}
