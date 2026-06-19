import { describe, expect, it } from "vitest";
import {
  dueSlots,
  isValidReminderTime,
  normaliseReminderTimes,
  parseHHMM,
} from "./reminders";

describe("reminder time parsing", () => {
  it("validates HH:MM", () => {
    expect(isValidReminderTime("05:55")).toBe(true);
    expect(isValidReminderTime("23:59")).toBe(true);
    expect(isValidReminderTime("24:00")).toBe(false);
    expect(isValidReminderTime("5:5")).toBe(false);
    expect(isValidReminderTime("12:60")).toBe(false);
  });

  it("parses to minutes since midnight", () => {
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("05:55")).toBe(355);
    expect(parseHHMM("20:30")).toBe(1230);
    expect(parseHHMM("nope")).toBeNull();
  });
});

describe("normaliseReminderTimes", () => {
  it("drops invalid, de-dupes, sorts, and caps at 6", () => {
    expect(normaliseReminderTimes(["20:30", "05:55", "05:55", "bad", "12:30"])).toEqual([
      "05:55",
      "12:30",
      "20:30",
    ]);
    expect(
      normaliseReminderTimes(["01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00"]),
    ).toHaveLength(6);
  });
});

describe("dueSlots", () => {
  const times = ["05:55", "12:30", "20:30"];

  it("fires a slot from its time until the window closes", () => {
    expect(dueSlots(times, parseHHMM("05:55")!)).toEqual(["05:55"]); // exactly on time
    expect(dueSlots(times, parseHHMM("06:00")!)).toEqual(["05:55"]); // 5 min late, still in 20m window
    expect(dueSlots(times, parseHHMM("06:15")!)).toEqual([]); // window closed
    expect(dueSlots(times, parseHHMM("05:40")!)).toEqual([]); // not yet
  });

  it("matches only the relevant slot", () => {
    expect(dueSlots(times, parseHHMM("12:35")!)).toEqual(["12:30"]);
    expect(dueSlots(times, parseHHMM("20:30")!)).toEqual(["20:30"]);
  });
});
