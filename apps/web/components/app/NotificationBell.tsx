"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/icons";

const LAST_READ_KEY = "tsr:notifLastRead";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        const lastRead = Number(localStorage.getItem(LAST_READ_KEY) ?? 0);
        const count = (data.notifications ?? []).filter(
          (n: { createdAt: string }) => new Date(n.createdAt).getTime() > lastRead,
        ).length;
        if (active) setUnread(count);
      } catch {
        /* ignore */
      }
    }
    load();
    const onRead = () => setUnread(0);
    window.addEventListener("notifications-read", onRead);
    return () => {
      active = false;
      window.removeEventListener("notifications-read", onRead);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-ink"
    >
      <BellIcon className="h-5 w-5" />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
