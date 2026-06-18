import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, login-free unsubscribe tokens for notification emails. The token is
// `base64url(userId).base64url(HMAC-SHA256(userId))` so a recipient can opt out
// straight from an email without authenticating, and nobody can unsubscribe
// someone else (they'd need the secret to forge the MAC). Server-only.

function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-unsubscribe-secret"
  );
}

function mac(userId: string): Buffer {
  return createHmac("sha256", secret()).update(userId).digest();
}

export function signUnsubscribe(userId: string): string {
  return `${Buffer.from(userId).toString("base64url")}.${mac(userId).toString("base64url")}`;
}

/** Returns the userId if the token is valid, else null. */
export function verifyUnsubscribe(token: string): string | null {
  const [idPart, macPart] = token.split(".");
  if (!idPart || !macPart) return null;
  let userId: string;
  let given: Buffer;
  try {
    userId = Buffer.from(idPart, "base64url").toString("utf8");
    given = Buffer.from(macPart, "base64url");
  } catch {
    return null;
  }
  const expected = mac(userId);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId;
}
