"use client";

import { useState } from "react";

/**
 * "Still there / Gone" confirmation for an availability report. Posts to
 * /api/confirmations and updates optimistically, reverting on failure.
 */
export function ConfirmControl({
  reportId,
  initial,
}: {
  reportId: string;
  initial?: boolean;
}) {
  const [agrees, setAgrees] = useState<boolean | undefined>(initial);
  const [busy, setBusy] = useState(false);

  async function send(value: boolean) {
    if (busy) return;
    const previous = agrees;
    setBusy(true);
    setAgrees(value); // optimistic
    try {
      const res = await fetch("/api/confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, agrees: value }),
      });
      if (!res.ok) setAgrees(previous);
    } catch {
      setAgrees(previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Is this still showing?">
      <button
        type="button"
        onClick={() => send(true)}
        disabled={busy}
        aria-pressed={agrees === true}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          agrees === true
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        Still there
      </button>
      <button
        type="button"
        onClick={() => send(false)}
        disabled={busy}
        aria-pressed={agrees === false}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          agrees === false
            ? "bg-rose-600 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        Gone
      </button>
    </div>
  );
}
