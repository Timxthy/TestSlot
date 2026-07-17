import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/supabase/config", () => ({ SUPABASE_ENABLED: true }));

import { checkSignupAttempt } from "./rate-limit";

describe("checkSignupAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_RATE_LIMIT_SECRET = "test-pepper";
  });

  it("consumes separate durable email and IP buckets", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    await expect(
      checkSignupAttempt(
        "Learner@example.com",
        new Headers({ "x-forwarded-for": "203.0.113.9" }),
      ),
    ).resolves.toEqual({ allowed: true });

    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    for (const [, args] of mocks.rpc.mock.calls) {
      expect(args.p_kind).toBe("signup");
      expect(args.p_identity_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(args.p_identity_hash).not.toContain("learner");
      expect(args.p_max_attempts).toBeGreaterThan(0);
    }
    expect(mocks.rpc.mock.calls[0]?.[1].p_identity_hash).not.toBe(
      mocks.rpc.mock.calls[1]?.[1].p_identity_hash,
    );
  });

  it("returns a stable rate-limit response when either bucket is exhausted", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });

    await expect(
      checkSignupAttempt(
        "learner@example.com",
        new Headers({ "x-forwarded-for": "203.0.113.9" }),
      ),
    ).resolves.toMatchObject({ allowed: false, reason: "limited" });
  });

  it("fails closed as unavailable when the durable check errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    await expect(
      checkSignupAttempt("learner@example.com", new Headers()),
    ).resolves.toMatchObject({ allowed: false, reason: "unavailable" });

    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
