import type { Metadata } from "next";
import { NEVER_SHARE, SCAM_WARNING_SIGNS } from "@testslot/shared";
import { PageHeader } from "@/components/PageHeader";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";

export const metadata: Metadata = {
  title: "Staying safe from test-slot scams",
  description:
    "How to spot driving test booking scams, what you should never share, and how to use TestSlot Radar safely under the 2026 DVSA rules.",
  alternates: { canonical: "/safety" },
};

export default function SafetyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your safety"
        title="Staying safe from test-slot scams"
        intro="Demand for tests is high, and that attracts scammers. Here’s how to protect yourself."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-2xl">Warning signs to walk away from</h2>
            <p className="mt-2 text-sm text-slate-600">
              If anyone says things like this, it’s a scam:
            </p>
            <ul className="mt-4 space-y-3">
              {SCAM_WARNING_SIGNS.map((sign) => (
                <li
                  key={sign}
                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"
                >
                  {sign}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-2xl">Never share or pay for these</h2>
            <ul className="mt-4 space-y-3">
              {NEVER_SHARE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    ✕
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="container-page mt-12 max-w-3xl space-y-10">
          <div>
            <h2 className="text-2xl">What changed in 2026</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              DVSA now says that only you can book, change, cancel or swap your own
              driving test, and that unofficial services which scan the booking
              service — including cancellation-finder apps — aren’t allowed.
              TestSlot Radar is built to stay on the right side of this: we never
              scan the booking service, and we never handle your booking or your
              DVSA details.
            </p>
          </div>

          <div>
            <h2 className="text-2xl">How to use TestSlot Radar safely</h2>
            <ul className="mt-4 space-y-2 text-slate-600">
              <li>• Only ever check and book on the official GOV.UK service yourself.</li>
              <li>• Never share your DVSA details with anyone — including us.</li>
              <li>• Treat anyone promising a “guaranteed” or paid-for slot as a scammer.</li>
              <li>• Report anyone asking for payment or personal details.</li>
            </ul>
          </div>

          <ComplianceDisclaimer />
        </div>
      </section>
    </>
  );
}
