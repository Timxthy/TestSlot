import { describe, expect, it } from "vitest";
import { formatReminderTime } from "./format";

describe("formatReminderTime", () => {
  it("formats 24h times as a friendly 12-hour clock", () => {
    expect(formatReminderTime("05:55")).toBe("5:55am");
    expect(formatReminderTime("12:30")).toBe("12:30pm");
    expect(formatReminderTime("20:30")).toBe("8:30pm");
    expect(formatReminderTime("00:00")).toBe("12:00am");
    expect(formatReminderTime("12:00")).toBe("12:00pm");
  });

  it("returns the input unchanged when it isn't HH:MM", () => {
    expect(formatReminderTime("not-a-time")).toBe("not-a-time");
  });
});
