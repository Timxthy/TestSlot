import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "TestSlot Radar terms of use. Not affiliated with DVSA — you book and manage your own test on GOV.UK. Draft terms pending legal review.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of use"
        intro="The essentials of using TestSlot Radar."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page max-w-3xl space-y-8 text-slate-600">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            These are beta terms. Public launch requires UK solicitor review,
            DPIA sign-off and processor-agreement review for the services we
            enable.
          </p>

          <div>
            <h2 className="text-2xl text-ink">Not affiliated with DVSA</h2>
            <p className="mt-3 leading-relaxed">
              TestSlot Radar is not affiliated with, approved by or endorsed by
              DVSA, DVLA or GOV.UK. You must book, change, cancel or swap your own
              driving test through the official GOV.UK service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl text-ink">No guarantees</h2>
            <p className="mt-3 leading-relaxed">
              Availability information is reported by the community and may be out
              of date or incomplete. We don’t guarantee that any test will be
              available, and we never sell or reserve test slots.
            </p>
          </div>

          <div>
            <h2 className="text-2xl text-ink">Using the service responsibly</h2>
            <ul className="mt-3 space-y-2">
              <li>• Don’t sell test slots or offer to book for others.</li>
              <li>• Don’t ask anyone for DVSA details or payment for a slot.</li>
              <li>• Don’t post false reports or misuse the community features.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl text-ink">Beta service</h2>
            <p className="mt-3 leading-relaxed">
              The service is provided “as is” during the beta while we build and
              improve it.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
