import { describe, it, expect } from "vitest";
import { cancellationInputSchema, screenForScam } from "./cancellations";

describe("screenForScam", () => {
  it("flags broker/scam language", () => {
    const res = screenForScam("Pay me £30 and WhatsApp me to buy");
    expect(res.flagged).toBe(true);
    expect(res.matched.length).toBeGreaterThan(0);
  });

  it("passes a clean announcement", () => {
    expect(screenForScam("Cancelling my afternoon slot — check GOV.UK after 3pm").flagged).toBe(false);
  });
});

describe("cancellationInputSchema", () => {
  const base = { centreSlug: "reading", plannedCancelAt: "2026-06-20T15:30" };

  it("accepts a post with all anti-broker confirmations", () => {
    expect(
      cancellationInputSchema.safeParse({
        ...base,
        noPayment: true,
        noPersonalDetails: true,
        understandsSelfBooking: true,
      }).success,
    ).toBe(true);
  });

  it("rejects a post missing a confirmation", () => {
    expect(
      cancellationInputSchema.safeParse({
        ...base,
        noPayment: true,
        noPersonalDetails: true,
        understandsSelfBooking: false,
      }).success,
    ).toBe(false);
  });
});
