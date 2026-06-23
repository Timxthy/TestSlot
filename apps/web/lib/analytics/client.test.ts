import { afterEach, describe, expect, it, vi } from "vitest";
import { identify, reportClientError, sentryLoaderSrc } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reportClientError", () => {
  it("captures a bounded $exception when PostHog is present", () => {
    const capture = vi.fn();
    vi.stubGlobal("window", { posthog: { capture } });

    reportClientError(new Error("boom"));

    expect(capture).toHaveBeenCalledTimes(1);
    const [event, props] = capture.mock.calls[0];
    expect(event).toBe("$exception");
    expect(props).toMatchObject({ name: "Error", message: "boom" });
  });

  it("truncates long messages to 300 chars", () => {
    const capture = vi.fn();
    vi.stubGlobal("window", { posthog: { capture } });

    reportClientError(new Error("x".repeat(1000)));
    expect(capture.mock.calls[0][1].message).toHaveLength(300);
  });

  it("is a no-op (no throw) when no destination is loaded", () => {
    vi.stubGlobal("window", {});
    expect(() => reportClientError(new Error("boom"))).not.toThrow();
  });

  it("forwards the exception to Sentry when it is loaded", () => {
    const captureException = vi.fn();
    vi.stubGlobal("window", { Sentry: { captureException } });
    const err = new Error("boom");
    reportClientError(err);
    expect(captureException).toHaveBeenCalledWith(err);
  });
});

describe("sentryLoaderSrc", () => {
  it("builds the loader URL from the DSN public key", () => {
    expect(
      sentryLoaderSrc("https://abc123@o456.ingest.de.sentry.io/789"),
    ).toBe("https://js.sentry-cdn.com/abc123.min.js");
  });

  it("returns null for an empty or malformed DSN", () => {
    expect(sentryLoaderSrc("")).toBeNull();
    expect(sentryLoaderSrc(undefined)).toBeNull();
    expect(sentryLoaderSrc("not-a-url")).toBeNull();
    // A URL with no public key (username) is unusable.
    expect(sentryLoaderSrc("https://o456.ingest.de.sentry.io/789")).toBeNull();
  });
});

describe("identify", () => {
  it("identifies the user when PostHog is present", () => {
    const identifyFn = vi.fn();
    vi.stubGlobal("window", { posthog: { identify: identifyFn } });

    identify("user-uuid");
    expect(identifyFn).toHaveBeenCalledWith("user-uuid");
  });

  it("does nothing with an empty id", () => {
    const identifyFn = vi.fn();
    vi.stubGlobal("window", { posthog: { identify: identifyFn } });

    identify("");
    expect(identifyFn).not.toHaveBeenCalled();
  });
});
