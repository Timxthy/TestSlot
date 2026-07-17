import { createHmac } from "node:crypto";

export type AuthAttemptKind = "signup" | "login";

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const candidate =
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    forwarded?.split(",")[0]?.trim() ||
    "unknown";

  // Keep an attacker-controlled forwarding header from creating unbounded hash
  // input while preserving complete IPv4/IPv6 addresses and proxy zone IDs.
  return candidate.slice(0, 128) || "unknown";
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
