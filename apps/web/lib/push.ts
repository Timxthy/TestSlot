import webpush from "web-push";

// Web push (VAPID). The PUBLIC key is also exposed to the browser via
// NEXT_PUBLIC_VAPID_PUBLIC_KEY for the subscribe flow; the PRIVATE key is a
// server secret. Generate a pair with `npx web-push generate-vapid-keys`.
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@testslotradar.app";

let configured = false;

/** True once VAPID keys are present; sets them on web-push on first call. */
export function isPushConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
  /** 404/410 — the subscription is dead and should be removed. */
  gone?: boolean;
}

export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string },
): Promise<PushResult> {
  if (!isPushConfigured()) return { ok: false, error: "push not configured" };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; body?: string };
    const gone = e.statusCode === 404 || e.statusCode === 410;
    return { ok: false, statusCode: e.statusCode, error: e.body ?? String(err), gone };
  }
}
