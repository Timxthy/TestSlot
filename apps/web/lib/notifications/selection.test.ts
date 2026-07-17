import { describe, expect, it } from "vitest";
import { shouldConsiderCancellationForDelivery } from "./selection";

describe("shouldConsiderCancellationForDelivery", () => {
  it("includes any approved active unexpired post regardless of approval age", () => {
    expect(
      shouldConsiderCancellationForDelivery({
        moderationStatus: "approved",
        status: "active",
        expiresAt: "2026-06-27T13:00:00.000Z",
        now: "2026-06-27T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("excludes pending, inactive or expired posts", () => {
    expect(
      shouldConsiderCancellationForDelivery({
        moderationStatus: "pending",
        status: "active",
        expiresAt: "2026-06-27T13:00:00.000Z",
        now: "2026-06-27T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      shouldConsiderCancellationForDelivery({
        moderationStatus: "approved",
        status: "removed",
        expiresAt: "2026-06-27T13:00:00.000Z",
        now: "2026-06-27T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      shouldConsiderCancellationForDelivery({
        moderationStatus: "approved",
        status: "active",
        expiresAt: "2026-06-27T11:59:59.000Z",
        now: "2026-06-27T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      shouldConsiderCancellationForDelivery({
        moderationStatus: "approved",
        status: "active",
        expiresAt: "not-a-date",
        now: "2026-06-27T12:00:00.000Z",
      }),
    ).toBe(false);
  });
});
