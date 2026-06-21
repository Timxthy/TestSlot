import { afterEach, describe, expect, it, vi } from "vitest";
import { identify, reportClientError } from "./client";

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

  it("is a no-op (no throw) when PostHog is not loaded", () => {
    vi.stubGlobal("window", {});
    expect(() => reportClientError(new Error("boom"))).not.toThrow();
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
