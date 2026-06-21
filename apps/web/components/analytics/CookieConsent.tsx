"use client";

import Link from "next/link";

/**
 * Cookie-consent banner (UK GDPR / PECR). Presentational only — the parent
 * <Analytics> owns the decision of whether to show it and what to do with the
 * choice. It is never rendered unless analytics is configured, so accepting is
 * the only thing that ever sets a non-essential cookie.
 */
export function CookieConsent({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
    >
      <div className="container-page">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            We use privacy-friendly analytics to understand how the site is used.
            No marketing trackers. See our{" "}
            <Link href="/privacy" className="font-medium text-brand-700 underline">
              privacy notice
            </Link>
            .
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onDecline} className="btn-secondary">
              Decline
            </button>
            <button type="button" onClick={onAccept} className="btn-primary">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
