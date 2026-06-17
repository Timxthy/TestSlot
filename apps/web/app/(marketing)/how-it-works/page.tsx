import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { HowItWorks } from "@/components/HowItWorks";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { GovUkLink } from "@/components/GovUkLink";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "TestSlot Radar helps you check GOV.UK smarter. You check and book yourself — we share community-reported availability so you know where and when it’s worth looking.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="We help you check GOV.UK smarter — you stay in control"
        intro="There is no official waiting list or cancellation list, and only you can book or change your own test. TestSlot Radar makes manual checking less of a guessing game."
      />

      <HowItWorks />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page max-w-3xl space-y-10">
          <div>
            <h2 className="text-2xl">What we do</h2>
            <ul className="mt-4 space-y-2 text-slate-600">
              <li>• Let you follow your local centres and realistic alternatives.</li>
              <li>• Remind you to check GOV.UK at sensible times.</li>
              <li>• Collect what learners report after they check, and show the patterns.</li>
              <li>• Alert you when several people report activity at a centre you follow.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl">What we never do</h2>
            <ul className="mt-4 space-y-2 text-slate-600">
              <li>• We never log into, poll or scan the DVSA booking service.</li>
              <li>• We never book, change, cancel or swap a test for you.</li>
              <li>• We never ask for your licence number, theory pass number, booking reference or GOV.UK login.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6">
            <h2 className="text-2xl">Ready to check?</h2>
            <p className="mt-2 text-slate-600">
              When it’s worth a look, open the official service and check it
              yourself. We’ll never do this part for you.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <GovUkLink />
              <Link href="/#waitlist" className="btn-primary">
                Join the beta
              </Link>
            </div>
          </div>

          <ComplianceDisclaimer />
        </div>
      </section>
    </>
  );
}
