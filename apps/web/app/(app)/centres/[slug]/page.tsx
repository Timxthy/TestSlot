import Link from "next/link";
import { notFound } from "next/navigation";
import { COMMUNITY_DATA_LABEL, entitlementsForTier, getNearbyCentres } from "@testslot/shared";
import { requireUser } from "@/lib/auth";
import { getServiceStore } from "@/lib/data";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Heatmap } from "@/components/app/Heatmap";
import { ReportFeed } from "@/components/app/ReportFeed";
import { FollowButton } from "@/components/app/FollowButton";
import { RealtimeRefresh } from "@/components/app/RealtimeRefresh";
import { centreStatusChannel } from "@/lib/realtime";
import { GovUkLink } from "@/components/GovUkLink";

export const dynamic = "force-dynamic";

export default async function AppCentrePage({
  params,
}: {
  params: { slug: string };
}) {
  const store = getServiceStore();
  const centre = await store.getCentre(params.slug);
  if (!centre) notFound();

  const user = await requireUser();
  const [status, heatmap, reports, follows, tier] = await Promise.all([
    store.getCentreStatus(centre.slug),
    store.getHeatmap(centre.slug),
    store.listReports(centre.slug, 12),
    store.listFollows(user.id),
    store.getSubscriptionTier(user.id),
  ]);
  const confirmations = await store.getUserConfirmations(
    user.id,
    reports.map((r) => r.id),
  );
  const canSeeHeatmap = entitlementsForTier(tier).heatmapAccess;
  const nearby = getNearbyCentres(centre);

  return (
    <div className="space-y-6">
      <RealtimeRefresh
        channel={centreStatusChannel(centre.slug)}
        table="centre_status"
        filter={`centre_slug=eq.${centre.slug}`}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-ink">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-3xl">{centre.name}</h1>
          <p className="text-slate-500">
            {centre.county} · {centre.postcodeArea}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status.status} />
          <FollowButton slug={centre.slug} initialFollowing={follows.includes(centre.slug)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Community activity</h2>
              <span className="text-xs text-slate-400">Confidence {status.confidence}%</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Availability 24h" value={status.metrics.availabilityReports24h} />
              <Metric label="Reporters 24h" value={status.metrics.uniqueReporters24h} />
              <Metric label="No-test 3d" value={status.metrics.noTestReports3d} />
              <Metric label="Reports 7d" value={status.metrics.totalReports7d} />
            </dl>
            <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
              {COMMUNITY_DATA_LABEL}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-lg">When tests have appeared</h2>
            <div className="mt-4">
              {canSeeHeatmap ? (
                <Heatmap data={heatmap} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-ink">Premium feature</p>
                  <p className="mt-1 text-sm text-slate-600">
                    The availability heatmap — the busiest days and times for
                    community-reported slots — is part of premium.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-lg">Recent reports</h2>
            <div className="mt-2">
              <ReportFeed reports={reports} confirmations={confirmations} />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="text-lg">Check &amp; report</h2>
            <p className="mt-1 text-sm text-slate-600">
              Check GOV.UK yourself, then tell the community what you saw.
            </p>
            <div className="mt-3 space-y-2">
              <GovUkLink className="btn-secondary w-full" />
              <Link href={`/report?centre=${centre.slug}`} className="btn-primary w-full">
                Report a check
              </Link>
            </div>
          </div>

          {nearby.length > 0 ? (
            <div className="card p-5">
              <h2 className="text-lg">Nearby centres</h2>
              <ul className="mt-3 space-y-2">
                {nearby.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/centres/${c.slug}`}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      {c.name}
                    </Link>{" "}
                    <span className="text-xs text-slate-400">{c.county}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}
