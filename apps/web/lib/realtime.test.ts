import { describe, expect, it } from "vitest";
import {
  cancellationsChannel,
  centreStatusChannel,
  realtimeEnabled,
} from "./realtime";

describe("realtimeEnabled", () => {
  it("requires both the public URL and anon key", () => {
    expect(realtimeEnabled("https://x.supabase.co", "anon")).toBe(true);
    expect(realtimeEnabled("https://x.supabase.co", "")).toBe(false);
    expect(realtimeEnabled("", "anon")).toBe(false);
    // Mock mode / E2E: both forced empty → realtime is inert.
    expect(realtimeEnabled(undefined, undefined)).toBe(false);
  });
});

describe("centreStatusChannel", () => {
  it("is stable and unique per centre", () => {
    expect(centreStatusChannel("reading")).toBe("centre-status:reading");
    expect(centreStatusChannel("reading")).toBe(centreStatusChannel("reading"));
    expect(centreStatusChannel("slough")).not.toBe(centreStatusChannel("reading"));
  });
});

describe("cancellationsChannel", () => {
  it("is a single shared board channel", () => {
    expect(cancellationsChannel()).toBe("cancellations-board");
    expect(cancellationsChannel()).not.toBe(centreStatusChannel("reading"));
  });
});
