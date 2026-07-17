function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message ?? "");
  }
  return String(err ?? "");
}

function codeOf(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code ?? "");
  }
  return "";
}

export const DB_ERROR_CODES = {
  followLimit: "TS001",
  dailyRateLimit: "TS002",
} as const;

export function isFollowLimitError(err: unknown): boolean {
  return (
    codeOf(err) === DB_ERROR_CODES.followLimit ||
    messageOf(err).includes("follow_limit:")
  );
}

export function isDailyLimitError(err: unknown): boolean {
  return (
    codeOf(err) === DB_ERROR_CODES.dailyRateLimit ||
    messageOf(err).includes("daily_rate_limit:")
  );
}
