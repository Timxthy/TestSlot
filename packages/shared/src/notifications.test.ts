import { describe, expect, it } from "vitest";
import { decideDelivery } from "./notifications";

describe("decideDelivery", () => {
  it("sends a brand-new delivery when none exists", () => {
    expect(decideDelivery(null)).toBe("send_new");
  });

  it("never re-sends an already-sent notification", () => {
    expect(decideDelivery({ status: "sent", attempts: 1 })).toBe("skip");
  });

  it("retries failed/pending deliveries below the cap", () => {
    expect(decideDelivery({ status: "failed", attempts: 1 })).toBe("retry");
    expect(decideDelivery({ status: "pending", attempts: 2 })).toBe("retry");
  });

  it("gives up once the retry cap is reached", () => {
    expect(decideDelivery({ status: "failed", attempts: 3 })).toBe("skip");
    expect(decideDelivery({ status: "failed", attempts: 1 }, 1)).toBe("skip");
  });
});
