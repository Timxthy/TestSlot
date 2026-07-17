import { describe, expect, it } from "vitest";
import {
  DB_ERROR_CODES,
  isDailyLimitError,
  isFollowLimitError,
} from "./errors";

describe("database error helpers", () => {
  it("detects follow-limit trigger errors", () => {
    expect(isFollowLimitError({ code: DB_ERROR_CODES.followLimit })).toBe(true);
    expect(isFollowLimitError(new Error("follow_limit:3"))).toBe(true);
    expect(isFollowLimitError({ message: "new row violates policy" })).toBe(false);
  });

  it("detects daily rate-limit trigger errors", () => {
    expect(isDailyLimitError({ code: DB_ERROR_CODES.dailyRateLimit })).toBe(true);
    expect(isDailyLimitError(new Error("daily_rate_limit:5"))).toBe(true);
    expect(isDailyLimitError({ message: "network failed" })).toBe(false);
  });
});
