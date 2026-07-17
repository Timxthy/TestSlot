import { getAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import {
  authAttemptWindowStart,
  clientIpFromHeaders,
  hashAuthIdentity,
  type AuthAttemptKind,
} from "./abuse";

const AUTH_WINDOW_MINUTES = 15;
const SIGNUP_EMAIL_MAX = 3;
const SIGNUP_IP_MAX = 20;

export type AuthAttemptCheck =
  | { allowed: true }
  | {
      allowed: false;
      reason: "limited" | "unavailable";
      message: string;
    };

function secret(): string {
  return (
    process.env.AUTH_RATE_LIMIT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.CRON_SECRET ||
    "local-dev-auth-rate-limit"
  );
}

async function consumeAttempt({
  kind,
  identityHash,
  maxAttempts,
}: {
  kind: AuthAttemptKind;
  identityHash: string;
  maxAttempts: number;
}): Promise<boolean> {
  const { data, error } = await getAdminClient().rpc("consume_auth_attempt", {
    p_kind: kind,
    p_identity_hash: identityHash,
    p_window_start: authAttemptWindowStart(new Date(), AUTH_WINDOW_MINUTES),
    p_max_attempts: maxAttempts,
  });
  if (error) throw error;
  return data === true;
}

export async function checkSignupAttempt(
  email: string,
  headers: Headers,
): Promise<AuthAttemptCheck> {
  if (!SUPABASE_ENABLED) return { allowed: true };

  const ip = clientIpFromHeaders(headers);
  const hashSecret = secret();
  const emailHash = hashAuthIdentity({
    kind: "signup",
    email,
    ip: "*",
    secret: hashSecret,
  });
  const ipHash = hashAuthIdentity({
    kind: "signup",
    email: "*",
    ip,
    secret: hashSecret,
  });

  try {
    const [emailAllowed, ipAllowed] = await Promise.all([
      consumeAttempt({
        kind: "signup",
        identityHash: emailHash,
        maxAttempts: SIGNUP_EMAIL_MAX,
      }),
      consumeAttempt({
        kind: "signup",
        identityHash: ipHash,
        maxAttempts: SIGNUP_IP_MAX,
      }),
    ]);
    if (!emailAllowed || !ipAllowed) {
      return {
        allowed: false,
        reason: "limited",
        message: "Too many signup attempts. Please wait a few minutes and try again.",
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error("signup abuse check failed", err);
    return {
      allowed: false,
      reason: "unavailable",
      message: "We couldn't verify this signup safely. Please try again shortly.",
    };
  }
}
