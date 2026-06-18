// Minimal Resend client over the REST API — no SDK dependency. Inert until
// RESEND_API_KEY is set, so the delivery cron is a safe no-op in mock/dev.
// Docs: https://resend.com/docs/api-reference/emails/send-email

const ENDPOINT = "https://api.resend.com/emails";

/** Verified sender. Set RESEND_FROM to an address on a Resend-verified domain. */
function fromAddress(): string {
  return (
    process.env.RESEND_FROM ??
    "TestSlot Radar <notifications@testslotradar.app>"
  );
}

/** True once a Resend API key is configured. Used to gate the delivery cron. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}
