import { describe, expect, it } from "vitest";
import {
  authAttemptWindowStart,
  clientIpFromHeaders,
  hashAuthIdentity,
} from "./abuse";

describe("auth abuse helpers", () => {
  it("uses Netlify's normalized client IP", () => {
    const headers = new Headers({
      "x-nf-client-connection-ip": "203.0.113.10",
    });

    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("ignores spoofable forwarding headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "2001:db8::1",
      "x-real-ip": "198.51.100.3",
      "x-forwarded-for": "198.51.100.4, 10.0.0.2",
    });
    expect(clientIpFromHeaders(headers)).toBe("unknown");
  });

  it("rejects missing or malformed normalized addresses", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
    expect(
      clientIpFromHeaders(
        new Headers({ "x-nf-client-connection-ip": "not-an-ip" }),
      ),
    ).toBe("unknown");
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
