"use client";

import { useState } from "react";

/** GDPR controls: download your data, or delete your account (anonymising reports). */
export function AccountDataControls() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        window.location.href = "/?deleted=1";
        return;
      }
      setError("Couldn't delete your account. Please try again.");
    } catch {
      setError("Couldn't delete your account. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <a
          href="/api/account/export"
          className="btn-secondary inline-block !py-2 text-sm"
          download
        >
          Download my data (JSON)
        </a>
        <p className="mt-2 text-sm text-slate-600">
          Everything we hold about you: profile, followed centres, reports,
          cancellations, confirmations and reminder settings.
        </p>
      </div>

      <div className="border-t border-slate-100 pt-4">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm font-semibold text-rose-600 hover:underline"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              This permanently deletes your account and personal data. Reports you
              submitted stay, but are <strong>anonymised</strong> so community stats
              remain accurate. This can’t be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                disabled={busy}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {busy ? "Deleting…" : "Yes, delete everything"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="btn-secondary !py-2 text-sm"
              >
                Cancel
              </button>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
