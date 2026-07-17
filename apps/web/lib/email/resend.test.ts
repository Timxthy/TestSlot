import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./resend";

describe("sendEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "Test <test@example.com>";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  });

  it("passes a stable provider idempotency key outside the email payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendEmail({
        to: "learner@example.com",
        subject: "Planned cancellation",
        html: "<p>Check GOV.UK yourself.</p>",
        idempotencyKey: "cancellation-email/delivery-1",
      }),
    ).resolves.toEqual({ ok: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
      "cancellation-email/delivery-1",
    );
    expect(JSON.parse(String(init.body))).not.toHaveProperty("idempotencyKey");
  });

  it("bounds provider idempotency keys to the documented limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({
      to: "learner@example.com",
      subject: "Planned cancellation",
      html: "<p>Check GOV.UK yourself.</p>",
      idempotencyKey: "x".repeat(300),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toHaveLength(
      256,
    );
  });
});
