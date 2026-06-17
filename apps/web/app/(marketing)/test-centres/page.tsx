import type { Metadata } from "next";
import { TEST_CENTRES } from "@testslot/shared";
import { CentreCard } from "@/components/CentreCard";
import { PageHeader } from "@/components/PageHeader";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";

export const metadata: Metadata = {
  title: "UK driving test centres",
  description:
    "Community-reported driving test availability patterns for test centres across Buckinghamshire, Berkshire, Oxfordshire, Hertfordshire, Bedfordshire and west London.",
  alternates: { canonical: "/test-centres" },
};

export default function TestCentresPage() {
  return (
    <>
      <PageHeader
        eyebrow="Test centres"
        title="Driving test centres we’re tracking"
        intro="We’re starting in the areas where learners are struggling most. Follow a centre to get community-reported activity and manual checking tips."
      />

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container-page">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEST_CENTRES.map((centre) => (
              <CentreCard key={centre.slug} centre={centre} />
            ))}
          </div>
          <ComplianceDisclaimer className="mt-10" />
        </div>
      </section>
    </>
  );
}
