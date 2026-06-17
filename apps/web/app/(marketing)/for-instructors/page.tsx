import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";

export const metadata: Metadata = {
  title: "For driving instructors",
  description:
    "Help your pupils coordinate cancellations safely — without booking on their behalf or handling DVSA details. Get a verified instructor badge after manual review.",
  alternates: { canonical: "/for-instructors" },
};

const canDo = [
  "Post when a pupil plans to cancel, so local learners can check GOV.UK themselves",
  "Earn a verified instructor badge after manual review",
  "See community-reported activity across the centres you cover",
  "List the centres you work with",
];

const cannotDo = [
  "Book, change, cancel or swap a test on a pupil’s behalf",
  "Take payment for a test slot or a “swap”",
  "Ask a learner for their licence number, theory pass or booking reference",
];

export default function ForInstructorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="For instructors"
        title="Help pupils find tests — safely and within the rules"
        intro="From 12 May 2026, only the learner can book and manage their own test. TestSlot Radar gives you a safe way to help without ever touching a pupil’s booking."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-2xl text-brand-700">What you can do</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {canDo.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-2xl text-rose-700">What you can’t do</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {cannotDo.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    ✕
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="container-page mt-12 max-w-3xl space-y-8">
          <div>
            <h2 className="text-2xl">Getting verified</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              When the beta opens, you’ll be able to apply with your business name,
              an optional ADI/PDI number, and a public profile or website. We
              review every application manually before a verified badge appears, so
              learners can trust your announcements.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6">
            <h2 className="text-2xl">Register your interest</h2>
            <p className="mt-2 text-slate-600">
              Join the waitlist as an instructor and we’ll invite you to the beta.
            </p>
            <Link href="/#waitlist" className="btn-primary mt-4">
              Join as an instructor
            </Link>
          </div>

          <ComplianceDisclaimer />
        </div>
      </section>
    </>
  );
}
