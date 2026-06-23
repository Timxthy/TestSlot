"use client";

import { ANALYTICS_CONFIGURED } from "@/lib/analytics/config";
import { openConsentSettings } from "@/lib/analytics/client";

/**
 * "Cookie settings" control — lets a user re-open the consent banner to change
 * or withdraw their choice. Renders nothing when analytics is unconfigured,
 * since then there is no consent to manage (and no cookie is ever set).
 */
export function ManageCookies({ className }: { className?: string }) {
  if (!ANALYTICS_CONFIGURED) return null;
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={className ?? "text-xs text-slate-400 underline transition hover:text-ink"}
    >
      Cookie settings
    </button>
  );
}
