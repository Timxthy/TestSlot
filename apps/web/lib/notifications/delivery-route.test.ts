import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUserById: vi.fn(),
  rpc: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    auth: { admin: { getUserById: mocks.getUserById } },
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));
vi.mock("@/lib/supabase/config", () => ({ SUPABASE_ENABLED: true }));
vi.mock("@/lib/email/resend", () => ({
  isEmailConfigured: () => true,
  sendEmail: mocks.sendEmail,
}));
vi.mock("@/lib/unsubscribe", () => ({
  signUnsubscribe: () => "signed-token",
}));

import { POST } from "@/app/api/cron/deliver-notifications/route";

type QueryResult = { data: unknown; error: unknown };

function queryBuilder(result: QueryResult) {
  const builder = {
    eq: vi.fn(),
    gt: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn(),
    not: vi.fn(),
    select: vi.fn(),
    then: undefined as unknown,
    update: vi.fn(),
  } as Record<string, ReturnType<typeof vi.fn>> & {
    then: PromiseLike<QueryResult>["then"];
  };

  for (const method of ["eq", "gt", "in", "not", "select", "update"] as const) {
    builder[method].mockReturnValue(builder);
  }
  builder.maybeSingle.mockResolvedValue(result);
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

function deliveryRequest() {
  return new Request("https://testslot.example/api/cron/deliver-notifications", {
    method: "POST",
    headers: { authorization: "Bearer cron-test-secret" },
  });
}

function setupRoute(finalization: QueryResult) {
  const now = Date.now();
  const posts = queryBuilder({
    data: [
      {
        id: "post-1",
        centre_slug: "reading",
        is_instructor: false,
        planned_cancel_at: new Date(now + 60 * 60_000).toISOString(),
        approved_at: new Date(now - 60 * 60_000).toISOString(),
        moderation_status: "approved",
        status: "active",
        expires_at: new Date(now + 2 * 60 * 60_000).toISOString(),
      },
    ],
    error: null,
  });
  const follows = queryBuilder({
    data: [{ user_id: "user-1" }],
    error: null,
  });
  const subscriptions = queryBuilder({ data: [], error: null });
  const deliveryUpdate = queryBuilder(finalization);

  mocks.from.mockImplementation((table: string) => {
    if (table === "cancellation_posts") return posts;
    if (table === "user_centres") return follows;
    if (table === "subscriptions") return subscriptions;
    if (table === "notification_deliveries") return deliveryUpdate;
    throw new Error(`Unexpected table: ${table}`);
  });
  mocks.rpc.mockResolvedValue({
    data: [
      {
        delivery_id: "delivery-1",
        delivery_attempts: 2,
        delivery_title: "Delivery title",
        delivery_body: "Delivery body",
      },
    ],
    error: null,
  });

  return deliveryUpdate;
}

describe("notification delivery route finalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
  });

  it("retries a transient recipient lookup failure instead of skipping permanently", async () => {
    const deliveryUpdate = setupRoute({ data: { id: "delivery-1" }, error: null });
    mocks.getUserById.mockResolvedValue({
      data: null,
      error: { message: "auth service unavailable" },
    });

    const response = await POST(deliveryRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ failed: 1, sent: 0, skipped: 0 });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(deliveryUpdate.update).toHaveBeenCalledWith({
      status: "failed",
      error: "recipient lookup failed",
    });
    expect(deliveryUpdate.eq.mock.calls).toContainEqual(["status", "pending"]);
    expect(deliveryUpdate.eq.mock.calls).toContainEqual(["attempts", 2]);
  });

  it("fails the job when a successful provider send cannot be finalized", async () => {
    const deliveryUpdate = setupRoute({
      data: null,
      error: { message: "database unavailable" },
    });
    mocks.getUserById.mockResolvedValue({
      data: { user: { email: "learner@example.com" } },
      error: null,
    });
    mocks.sendEmail.mockResolvedValue({ ok: true });

    const response = await POST(deliveryRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Could not record notification delivery outcome.");
    expect(JSON.stringify(body)).not.toContain("database unavailable");
    expect(deliveryUpdate.update).toHaveBeenCalledWith({
      status: "sent",
      sent_at: expect.any(String),
    });
    expect(deliveryUpdate.eq.mock.calls).toContainEqual(["status", "pending"]);
    expect(deliveryUpdate.eq.mock.calls).toContainEqual(["attempts", 2]);
  });

  it("does not let a stale worker finalize an attempt it no longer owns", async () => {
    const deliveryUpdate = setupRoute({ data: null, error: null });
    mocks.getUserById.mockResolvedValue({
      data: { user: { email: "learner@example.com" } },
      error: null,
    });
    mocks.sendEmail.mockResolvedValue({ ok: true });

    const response = await POST(deliveryRequest());

    expect(response.status).toBe(500);
    expect(deliveryUpdate.eq.mock.calls).toContainEqual(["status", "pending"]);
    expect(deliveryUpdate.eq.mock.calls).toContainEqual(["attempts", 2]);
  });
});
