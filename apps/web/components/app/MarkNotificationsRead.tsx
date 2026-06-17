"use client";

import { useEffect } from "react";

const LAST_READ_KEY = "tsr:notifLastRead";

/** Marks notifications as read on mount and tells the bell to clear its badge. */
export function MarkNotificationsRead() {
  useEffect(() => {
    localStorage.setItem(LAST_READ_KEY, String(Date.now()));
    window.dispatchEvent(new Event("notifications-read"));
  }, []);
  return null;
}
