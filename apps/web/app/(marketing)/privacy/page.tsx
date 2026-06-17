import type { Metadata } from "next";
import { NEVER_SHARE } from "@testslot/shared";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How TestSlot Radar handles your data: email and postcode area only, never DVSA details. Draft privacy notice pending legal review.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy"
        intro="We’re built privacy-first and collect as little as possible."
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page max-w-3xl space-y-8 text-slate-600">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This is a draft notice for the beta and will be finalised by a UK
            solicitor before public launch.
          </p>

          <div>
            <h2 className="text-2xl text-ink">What we collect</h2>
            <ul className="mt-3 space-y-2">
              <li>• Your email address.</li>
              <li>• Your postcode area (outward code only, e.g. HP13).</li>
              <li>• Optionally, whether you’re a learner, instructor or parent.</li>
              <li>• Your consent to be contacted about the beta.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl text-ink">What we never collect</h2>
            <ul className="mt-3 space-y-2">
              {NEVER_SHARE.map((item) => (
                <li key={item}>• {item}.</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl text-ink">How we use it</h2>
            <p className="mt-3 leading-relaxed">
              We use your email to contact you about the beta, and your postcode
              area to match you to nearby test centres. We don’t sell your data,
              and we don’t use it for anything else.
            </p>
          </div>

          <div>
            <h2 className="text-2xl text-ink">Your rights</h2>
            <p className="mt-3 leading-relaxed">
              You can ask us to show you the data we hold about you, or to delete
              it, at any time. Contact us and we’ll action it.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
