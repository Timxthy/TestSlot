import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { getUserNotifications } from "@/lib/notifications";
import { MarkNotificationsRead } from "@/components/app/MarkNotificationsRead";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const toneDot: Record<string, string> = {
  good: "bg-emerald-500",
  neutral: "bg-slate-400",
  warn: "bg-amber-500",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await getUserNotifications(getServiceStore(), user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <MarkNotificationsRead />
      <div>
        <h1 className="text-3xl">Notifications</h1>
        <p className="mt-1 text-slate-600">
          Community activity for the centres you follow.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="card p-6 text-slate-500">
          No alerts right now. We’ll let you know when your centres get activity.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id} className="card p-4">
              <Link href={`/centres/${n.centreSlug}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <span className={`h-2 w-2 rounded-full ${toneDot[n.tone]}`} />
                    {n.title}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-1 pl-4 text-sm text-slate-600">{n.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-400">
        Alerts are based on community reports, not live DVSA data. On the free
        plan they may be delayed — you always check and book on GOV.UK yourself.
      </p>
    </div>
  );
}
