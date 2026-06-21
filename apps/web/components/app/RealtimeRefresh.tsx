"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { REALTIME_DEBOUNCE_MS, realtimeEnabled } from "@/lib/realtime";

// NEXT_PUBLIC_* are inlined at build time. In mock mode (and in the E2E suite,
// which forces them empty) realtimeEnabled() is false and this is a no-op.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Subscribes to live changes on a public-read table and refreshes the server
 * components (debounced) when a relevant row changes. Renders nothing.
 *
 * Only ever point this at tables whose RLS already permits client SELECT
 * (centre_status, approved+active cancellation_posts) — realtime respects RLS,
 * so the browser receives events only for rows it is allowed to read.
 */
export function RealtimeRefresh({
  channel,
  table,
  filter,
}: {
  channel: string;
  table: string;
  /** Optional PostgREST filter, e.g. `centre_slug=eq.reading`. */
  filter?: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!realtimeEnabled(url, anonKey)) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // Lazy-load the Supabase realtime client only when realtime is actually on
    // (live mode), so its weight stays out of the initial page bundle.
    void (async () => {
      const { createBrowserClient } = await import("@supabase/ssr");
      if (cancelled) return;

      const supabase = createBrowserClient(url as string, anonKey as string);
      const sub = supabase
        .channel(channel)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
          () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => router.refresh(), REALTIME_DEBOUNCE_MS);
          },
        )
        .subscribe();

      cleanup = () => {
        if (timer.current) clearTimeout(timer.current);
        supabase.removeChannel(sub);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [channel, table, filter, router]);

  return null;
}
