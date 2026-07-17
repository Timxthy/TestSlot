import { TEST_CENTRES, getCentreBySlug } from "@testslot/shared";
import { getServiceStore } from "@/lib/data";
import { CancellationForm } from "@/components/app/CancellationForm";
import { RealtimeRefresh } from "@/components/app/RealtimeRefresh";
import { cancellationsChannel } from "@/lib/realtime";
import { formatDateTime, formatMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CancellationsPage() {
  const store = getServiceStore();
  const posts = await store.listCancellations();
  const centres = TEST_CENTRES.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <RealtimeRefresh channel={cancellationsChannel()} table="cancellation_board_events" />
      <section>
        <h1 className="text-3xl">Cancellation board</h1>
        <p className="mt-1 text-slate-600">
          Learners and verified instructors announcing planned cancellations. No
          slot is guaranteed — you must book on GOV.UK yourself.
        </p>

        {posts.length === 0 ? (
          <p className="mt-6 text-slate-500">No active announcements right now.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {posts.map((p) => (
              <li key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-ink">
                    {getCentreBySlug(p.centreSlug)?.name ?? p.centreSlug}
                  </div>
                  {p.isInstructor ? (
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                      Verified instructor
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Plans to cancel:{" "}
                  <span className="font-medium text-ink">{formatDateTime(p.plannedCancelAt)}</span>
                  {p.testMonth ? ` · test in ${formatMonth(p.testMonth)}` : ""}
                </p>
                {p.note ? <p className="mt-2 text-sm text-slate-700">{p.note}</p> : null}
                <p className="mt-2 text-xs text-slate-400">
                  Others must book/change on GOV.UK themselves. No slot is guaranteed.
                </p>
                <p className="mt-1 text-xs text-slate-400">by {p.authorName}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside>
        <div className="card p-5">
          <h2 className="text-lg">Post a cancellation</h2>
          <CancellationForm centres={centres} />
        </div>
      </aside>
    </div>
  );
}
