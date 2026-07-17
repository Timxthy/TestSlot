import { describe, expect, it } from "vitest";
import {
  authAttemptWindowStart,
  clientIpFromHeaders,
  hashAuthIdentity,
} from "./abuse";

describe("auth abuse helpers", () => {
  it("extracts the first forwarded client IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.4",
    });

    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("prefers a proxy-normalized client address and bounds header input", () => {
    const headers = new Headers({
      "cf-connecting-ip": "2001:db8::1",
      "x-forwarded-for": "198.51.100.4, 10.0.0.2",
    });
    expect(clientIpFromHeaders(headers)).toBe("2001:db8::1");

    const oversized = new Headers({ "x-forwarded-for": "a".repeat(300) });
    expect(clientIpFromHeaders(oversized)).toHaveLength(128);
  });

  it("falls back to a stable unknown IP marker", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });

  it("hashes auth identities without returning raw email or IP", () => {
    const hash = hashAuthIdentity({
      kind: "signup",
      email: " Learner@Example.COM ",
      ip: "203.0.113.10",
      secret: "server-secret",
    });

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("learner");
    expect(hash).not.toContain("203.0.113.10");
    expect(hash).toBe(
      hashAuthIdentity({
        kind: "signup",
        email: "learner@example.com",
        ip: "203.0.113.10",
        secret: "server-secret",
      }),
    );
    expect(hash).not.toBe(
      hashAuthIdentity({
        kind: "signup",
        email: "learner@example.com",
        ip: "203.0.113.10",
        secret: "different-secret",
      }),
    );
  });

  it("rounds timestamps down to the auth attempt window", () => {
    expect(authAttemptWindowStart(new Date("2026-06-27T12:34:56Z"), 15)).toBe(
      "2026-06-27T12:30:00.000Z",
    );
  });
});
