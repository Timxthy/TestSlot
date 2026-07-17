import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureServer: vi.fn(),
  checkSignupAttempt: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({
  captureServer: mocks.captureServer,
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  checkSignupAttempt: mocks.checkSignupAttempt,
}));
vi.mock("@/lib/supabase/config", () => ({ SUPABASE_ENABLED: true }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { signUp: mocks.signUp },
  }),
}));

import { POST } from "@/app/api/auth/signup/route";

function signupRequest() {
  return new Request("https://testslot.example/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.7",
    },
    body: JSON.stringify({
      name: "Learner",
      email: "learner@example.com",
      password: "correct-horse-battery",
    }),
  });
}

describe("signup route hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://testslot.example/";
    mocks.checkSignupAttempt.mockResolvedValue({ allowed: true });
  });

  it("returns 429 without calling Supabase when the durable limit is exhausted", async () => {
    mocks.checkSignupAttempt.mockResolvedValue({
      allowed: false,
      reason: "limited",
      message: "Too many signup attempts.",
    });

    const response = await POST(signupRequest());

    expect(response.status).toBe(429);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("returns 503 when the durable abuse check is unavailable", async () => {
    mocks.checkSignupAttempt.mockResolvedValue({
      allowed: false,
      reason: "unavailable",
      message: "Try again shortly.",
    });

    const response = await POST(signupRequest());

    expect(response.status).toBe(503);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("uses email-confirmed signup and records the manual-login dependency", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });

    const response = await POST(signupRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.next).toBe("/login?checkEmail=1");
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "learner@example.com",
      password: "correct-horse-battery",
      options: {
        data: { name: "Learner" },
        emailRedirectTo: "https://testslot.example/login",
      },
    });
    expect(mocks.captureServer).toHaveBeenCalledWith("signup_completed", "user-1");
  });

  it("does not reveal an existing account through the error response", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });

    const response = await POST(signupRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Could not create your account. Please try again.");
    expect(JSON.stringify(body)).not.toMatch(/already|registered|exists/i);
  });
});
