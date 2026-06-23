// Pure helpers for the live centre feed. Realtime is layered on top of the
// existing server-rendered reads: the browser subscribes to the public-read
// `centre_status` row and asks Next to re-fetch when the status engine updates
// it. We deliberately subscribe to the aggregate status (public read) — never to
// raw `availability_reports`, which RLS keeps off-limits to clients — so realtime
// can never leak an individual's report.

/** Coalesce bursts of changes into a single refresh. */
export const REALTIME_DEBOUNCE_MS = 1500;

/** Live mode requires the public Supabase URL + anon key in the browser bundle. */
export function realtimeEnabled(
  url: string | undefined | null,
  anonKey: string | undefined | null,
): boolean {
  return Boolean(url && anonKey);
}

/** Stable per-centre channel name. */
export function centreStatusChannel(slug: string): string {
  return `centre-status:${slug}`;
}

/**
 * Channel for the cancellation board. RLS (cancellations_public_read) only
 * exposes approved + active posts to clients, so a browser subscription receives
 * events only for rows it is already allowed to read — pending/rejected posts
 * never reach it.
 */
export function cancellationsChannel(): string {
  return "cancellations-board";
}
