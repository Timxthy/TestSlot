"use client";

import { useState } from "react";
import {
  DEFAULT_REMINDER_TIMES,
  MAX_REMINDER_TIMES,
  type ReminderPreferences,
} from "@testslot/shared";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function ReminderSettings({ initial }: { initial: ReminderPreferences }) {
  const [times, setTimes] = useState<string[]>(
    initial.times.length ? initial.times : DEFAULT_REMINDER_TIMES,
  );
  const [enabled, setEnabled] = useState(initial.enabled);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  function setTime(i: number, value: string) {
    setTimes((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  }
  function removeTime(i: number) {
    setTimes((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addTime() {
    setTimes((prev) => (prev.length < MAX_REMINDER_TIMES ? [...prev, "09:00"] : prev));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ times, enabled }),
      });
      const json = await res.json();
      if (res.ok) {
        setTimes(json.prefs.times);
        setStatus("Saved.");
      } else {
        setStatus(json.error ?? "Couldn't save.");
      }
    } catch {
      setStatus("Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function enablePush() {
    setPushStatus(null);
    if (!vapidKey) {
      setPushStatus("Push notifications aren't configured on the server yet.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("This browser doesn't support push notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("Notifications are blocked for this site.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setPushStatus(res.ok ? "Push enabled on this device." : "Couldn't save this device.");
    } catch {
      setPushStatus("Couldn't enable push on this device.");
    }
  }

  return (
    <div className="space-y-6">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-medium text-ink">Send me check reminders</span>
      </label>

      <div>
        <h3 className="text-sm font-semibold text-ink">Reminder times</h3>
        <p className="mt-1 text-sm text-slate-600">
          We’ll nudge you to check GOV.UK yourself at these times (UK time). We
          never check or book for you.
        </p>
        <ul className="mt-3 space-y-2">
          {times.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={t}
                onChange={(e) => setTime(i, e.target.value)}
                aria-label={`Reminder time ${i + 1}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeTime(i)}
                className="text-sm text-slate-500 hover:text-rose-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {times.length < MAX_REMINDER_TIMES ? (
          <button
            type="button"
            onClick={addTime}
            className="mt-3 text-sm font-semibold text-brand-700 hover:underline"
          >
            + Add a time
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-primary !py-2 text-sm">
          {saving ? "Saving…" : "Save reminders"}
        </button>
        {status ? <span className="text-sm text-slate-600">{status}</span> : null}
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-ink">Push on this device</h3>
        <p className="mt-1 text-sm text-slate-600">
          Turn on browser notifications so reminders arrive even when the tab is
          closed.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={enablePush} className="btn-secondary !py-2 text-sm">
            Enable push
          </button>
          {pushStatus ? <span className="text-sm text-slate-600">{pushStatus}</span> : null}
        </div>
      </div>
    </div>
  );
}
