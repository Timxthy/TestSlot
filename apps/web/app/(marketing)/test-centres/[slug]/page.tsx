import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COMMUNITY_DATA_LABEL,
  TEST_CENTRES,
  getCentreBySlug,
  getNearbyCentres,
} from "@testslot/shared";
import { PageHeader } from "@/components/PageHeader";
import { CentreCard } from "@/components/CentreCard";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { GovUkLink } from "@/components/GovUkLink";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return TEST_CENTRES.map((centre) => ({ slug: centre.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const centre = getCentreBySlug(params.slug);
  if (!centre) return {};
  return {
    title: `${centre.name} driving test centre`,
    description: `Community-reported driving test availability patterns for ${centre.name} (${centre.county}). No DVSA login, no scanning — you check GOV.UK yourself.`,
    alternates: { canonical: `/test-centres/${centre.slug}` },
  };
}

const tips = [
  "Check at a few different times of day — availability comes and goes.",
  "Keep one or two nearby centres in mind as realistic alternatives.",
  "Note when the community reports activity here, and check GOV.UK soon after.",
  "Only ever book or change your test on the official GOV.UK service.",
];

export default function CentrePage({ params }: { params: Params }) {
  const centre = getCentreBySlug(params.slug);
  if (!centre) notFound();
  const nearby = getNearbyCentres(centre);

  return (
    <>
      <PageHeader eyebrow={centre.county} title={`${centre.name} driving test centre`} intro={centre.blurb} />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-10">
            <div className="card p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl">Community activity</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  Coming soon
                </span>
              </div>
              <p className="mt-3 text-slate-600">
                We’re gathering reports for {centre.name}. Once the beta launches,
                you’ll see recent learner-reported activity here.
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                {COMMUNITY_DATA_LABEL}
              </p>
            </div>

            <div>
              <h2 className="text-2xl">Manual checking tips</h2>
              <ul className="mt-4 space-y-2 text-slate-600">
                {tips.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </div>

            {nearby.length > 0 ? (
              <div>
                <h2 className="text-2xl">Nearby centres</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {nearby.map((c) => (
                    <CentreCard key={c.slug} centre={c} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg">Follow {centre.name}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Join the beta to follow this centre and get community alerts.
              </p>
              <Link href="/#waitlist" className="btn-primary mt-4 w-full">
                Join the beta
              </Link>
              <div className="mt-3">
                <GovUkLink className="btn-secondary w-full" />
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg">Stay safe</h2>
              <p className="mt-2 text-sm text-slate-600">
                Never pay anyone for a slot or share your DVSA details.
              </p>
              <Link href="/safety" className="mt-3 inline-block text-sm font-semibold text-brand-700">
                Read the safety guide →
              </Link>
            </div>
          </aside>
        </div>

        <div className="container-page mt-12">
          <ComplianceDisclaimer />
        </div>
      </section>
    </>
  );
}
