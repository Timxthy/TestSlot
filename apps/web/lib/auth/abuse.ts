import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export type AuthAttemptKind = "signup" | "login";

export function clientIpFromHeaders(headers: Headers): string {
  // Netlify injects this header for Functions. Do not trust client-controlled
  // forwarding headers: an attacker could rotate them to evade the IP bucket.
  const candidate = headers.get("x-nf-client-connection-ip")?.trim() ?? "";
  return isIP(candidate) ? candidate : "unknown";
}

export function hashAuthIdentity({
  kind,
  email,
  ip,
  secret,
}: {
  kind: AuthAttemptKind;
  email: string;
  ip: string;
  secret: string;
}): string {
  return createHmac("sha256", secret)
    .update(kind)
    .update("\0")
    .update(email.trim().toLowerCase())
    .update("\0")
    .update(ip.trim())
    .digest("hex");
}

export function authAttemptWindowStart(now: Date, windowMinutes: number): string {
  const windowMs = windowMinutes * 60_000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
}
