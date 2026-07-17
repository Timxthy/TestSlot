import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureServer, isServerAnalyticsConfigured } from "./server";

const ENV_KEYS = [
  "POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "POSTHOG_HOST",
  "NEXT_PUBLIC_POSTHOG_HOST",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  vi.restoreAllMocks();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("isServerAnalyticsConfigured", () => {
  it("is false without a key and true once one is set", () => {
    expect(isServerAnalyticsConfigured()).toBe(false);
    process.env.POSTHOG_KEY = "phc_server";
    expect(isServerAnalyticsConfigured()).toBe(true);
  });

  it("does not treat the browser PostHog key as server analytics consent", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_browser";
    expect(isServerAnalyticsConfigured()).toBe(false);
  });
});

describe("captureServer", () => {
  it("is a no-op (no network) when unconfigured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await captureServer("report_submitted", "user-1", { centre: "reading" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not POST without explicit analytics consent", async () => {
    process.env.POSTHOG_KEY = "phc_server";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await captureServer("report_submitted", "user-1", { centre: "reading" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs a well-formed capture payload to the EU host once consent is granted", async () => {
    process.env.POSTHOG_KEY = "phc_server";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await captureServer("report_submitted", "user-1", { centre: "reading" }, { consent: "granted" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://eu.i.posthog.com/capture/");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.api_key).toBe("phc_server");
    expect(body.event).toBe("report_submitted");
    expect(body.distinct_id).toBe("user-1");
    expect(body.properties).toMatchObject({ centre: "reading", $lib: "testslot-server" });
    expect(typeof body.timestamp).toBe("string");
  });

  it("honours a custom host and trims trailing slashes", async () => {
    process.env.POSTHOG_KEY = "phc_server";
    process.env.POSTHOG_HOST = "https://ph.example.com/";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await captureServer("signup_completed", "user-2", {}, { consent: "granted" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://ph.example.com/capture/");
  });

  it("never throws when the network rejects (best-effort)", async () => {
    process.env.POSTHOG_KEY = "phc_server";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      captureServer("report_submitted", "user-3", {}, { consent: "granted" }),
    ).resolves.toBeUndefined();
  });

  it("falls back to 'anonymous' when no distinct id is given", async () => {
    process.env.POSTHOG_KEY = "phc_server";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await captureServer("report_submitted", "", {}, { consent: "granted" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).distinct_id).toBe("anonymous");
  });
});
