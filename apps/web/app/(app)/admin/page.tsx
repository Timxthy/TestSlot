import { getCentreBySlug } from "@testslot/shared";
import { requireModerator } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { ModerationActions } from "@/components/app/ModerationActions";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireModerator();
  const store = getServiceStore();
  const pending = await store.listPendingCancellations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Moderation</h1>
        <p className="mt-1 text-slate-600">
          Cancellation posts flagged by the scam filter, waiting for review.
        </p>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Restricted area. Every action here is recorded in an append-only audit
        log. Only sign in from a trusted device.
      </p>

      {pending.length === 0 ? (
        <p className="text-slate-500">Nothing waiting for review.</p>
      ) : (
        <ul className="space-y-4">
          {pending.map((p) => (
            <li key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-semibold text-ink">
                    {getCentreBySlug(p.centreSlug)?.name ?? p.centreSlug}
                  </span>{" "}
                  <span className="text-xs text-slate-400">by {p.authorName}</span>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  Pending
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Plans to cancel: {formatDateTime(p.plannedCancelAt)}
              </p>
              {p.note ? (
                <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{p.note}</p>
              ) : null}
              <div className="mt-3">
                <ModerationActions id={p.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
