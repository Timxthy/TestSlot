import Link from "next/link";
import { STATUS_META, getCentreBySlug } from "@testslot/shared";
import { requireUser } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { StatusBadge } from "@/components/app/StatusBadge";
import { GovUkLink } from "@/components/GovUkLink";
import { formatReminderTime, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const store = getServiceStore();
  const [follows, statuses, reminderPrefs] = await Promise.all([
    store.listFollows(user.id),
    store.listCentreStatuses(),
    store.getReminderPreferences(user.id),
  ]);
  const reminderTimes =
    reminderPrefs.enabled ? reminderPrefs.times : [];

  const followed = follows
    .map((slug) => ({ centre: getCentreBySlug(slug), status: statuses[slug] }))
    .filter((f): f is { centre: NonNullable<typeof f.centre>; status: typeof f.status } =>
      Boolean(f.centre && f.status),
    );

  const alerts = followed.filter((f) =>
    ["active_now", "recently_active"].includes(f.status.status),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Good to see you, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-slate-600">
          Community-reported activity for the centres you follow.
        </p>
      </div>

      {alerts.length > 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold text-emerald-800">Worth a look right now</h2>
          <ul className="mt-2 space-y-1 text-sm text-emerald-900">
            {alerts.map((a) => (
              <li key={a.centre.slug}>
                • <span className="font-medium">{a.centre.name}</span>:{" "}
                {STATUS_META[a.status.status].label.toLowerCase()} —{" "}
                {a.status.metrics.availabilityReports24h} availability report
                {a.status.metrics.availabilityReports24h === 1 ? "" : "s"} in 24h.{" "}
                <span className="opacity-80">Check GOV.UK yourself.</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Your centres</h2>
          <Link href="/test-centres" className="text-sm font-semibold text-brand-700">
            Add centres
          </Link>
        </div>
        {followed.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-medium text-ink">You’re not following any centres yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
              Follow the test centres near you to see community-reported activity
              and get check reminders.
            </p>
            <Link href="/test-centres" className="btn-primary mt-4 inline-block">
              Find centres to follow
            </Link>
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {followed.map(({ centre, status }) => (
            <div key={centre.slug} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/centres/${centre.slug}`}
                    className="text-lg font-semibold text-ink hover:text-brand-700"
                  >
                    {centre.name}
                  </Link>
                  <p className="text-sm text-slate-500">{centre.county}</p>
                </div>
                <StatusBadge status={status.status} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                <Metric label="Avail. 24h" value={status.metrics.availabilityReports24h} />
                <Metric label="Reporters" value={status.metrics.uniqueReporters24h} />
                <Metric
                  label="Last report"
                  value={status.metrics.lastReportAt ? timeAgo(status.metrics.lastReportAt) : "—"}
                  small
                />
              </dl>
              <div className="mt-4 flex gap-2">
                <Link href={`/centres/${centre.slug}`} className="btn-secondary !py-2 text-sm">
                  View
                </Link>
                <Link href={`/report?centre=${centre.slug}`} className="btn-primary !py-2 text-sm">
                  Report a check
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Check reminders</h2>
          <Link href="/settings" className="text-sm font-semibold text-brand-700">
            Manage
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          We’ll nudge you to check GOV.UK yourself at these times. Turn on push in{" "}
          <Link href="/settings" className="font-medium text-brand-700 hover:underline">
            reminder settings
          </Link>
          .
        </p>
        {reminderTimes.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {reminderTimes.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {formatReminderTime(t)}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No check reminders set yet.{" "}
            <Link href="/settings" className="font-medium text-brand-700 hover:underline">
              Set them up
            </Link>
            .
          </p>
        )}
        <div className="mt-4">
          <GovUkLink />
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-semibold text-ink ${small ? "text-sm" : "text-lg"}`}>{value}</dd>
    </div>
  );
}
