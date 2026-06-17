import { describe, it, expect } from "vitest";
import { waitlistSchema } from "./waitlist";

describe("waitlistSchema", () => {
  it("normalises email + postcode and requires consent", () => {
    const res = waitlistSchema.safeParse({
      email: "  Foo@Example.com ",
      postcodeArea: "hp13",
      consented: true,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe("foo@example.com");
      expect(res.data.postcodeArea).toBe("HP13");
    }
  });

  it("rejects a full postcode / non-area", () => {
    expect(
      waitlistSchema.safeParse({ email: "a@b.com", postcodeArea: "LONDON", consented: true }).success,
    ).toBe(false);
  });

  it("requires consent to be true", () => {
    expect(
      waitlistSchema.safeParse({ email: "a@b.com", postcodeArea: "HP13", consented: false }).success,
    ).toBe(false);
  });
});
