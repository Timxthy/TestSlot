// Manual reminder scheduling (PRD §6.4). All times are "HH:MM" in the user's
// timezone (default Europe/London). The server matches clock times only and
// nudges the user to check GOV.UK themselves — it never checks DVSA.

export const DEFAULT_REMINDER_TIMES = ["05:55", "12:30", "20:30"];
export const DEFAULT_TIMEZONE = "Europe/London";
/** Must be >= the dispatch cron interval so no slot is missed between runs. */
export const REMINDER_WINDOW_MINUTES = 20;
export const MAX_REMINDER_TIMES = 6;

export const REMINDER_PUSH_TITLE = "Time to check for test slots";
export const REMINDER_PUSH_BODY =
  "Open GOV.UK and check availability yourself — we never check or book for you.";

export interface ReminderPreferences {
  times: string[];
  timezone: string;
  enabled: boolean;
  channels: string[];
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidReminderTime(s: string): boolean {
  return HHMM.test(s);
}

/** "HH:MM" → minutes since local midnight, or null if malformed. */
export function parseHHMM(s: string): number | null {
  const m = HHMM.exec(s);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Normalises a user-supplied times list: valid, unique, sorted, capped. */
export function normaliseReminderTimes(times: string[]): string[] {
  const valid = times.filter(isValidReminderTime);
  const unique = Array.from(new Set(valid));
  unique.sort((a, b) => (parseHHMM(a) ?? 0) - (parseHHMM(b) ?? 0));
  return unique.slice(0, MAX_REMINDER_TIMES);
}

/**
 * The slots that are "due" right now: those whose time is at or just before the
 * current local minute-of-day (within the window). Used by the dispatcher.
 */
export function dueSlots(
  times: string[],
  nowMinutes: number,
  windowMins: number = REMINDER_WINDOW_MINUTES,
): string[] {
  return times.filter((t) => {
    const m = parseHHMM(t);
    return m !== null && nowMinutes >= m && nowMinutes < m + windowMins;
  });
}

/** Hostnames of the real browser push services we deliver to. */
export const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com", // Chrome / Chromium / Edge
  "push.services.mozilla.com", // Firefox
  "notify.windows.com", // legacy Windows/Edge
  "push.apple.com", // Safari
];

/**
 * SSRF guard for stored push subscriptions: the cron later makes server-side
 * requests to these endpoints, so only accept HTTPS URLs on a known push host —
 * never localhost / private / arbitrary endpoints.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}
