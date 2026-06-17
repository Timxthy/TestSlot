import Link from "next/link";
import { TEST_CENTRES } from "@testslot/shared";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { SafetySection } from "@/components/SafetySection";
import { InstructorSection } from "@/components/InstructorSection";
import { Faq, FAQ_ITEMS } from "@/components/Faq";
import { WaitlistSection } from "@/components/WaitlistSection";
import { CentreCard } from "@/components/CentreCard";
import { ArrowRightIcon } from "@/components/icons";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema, faqSchema } from "@/lib/schema";

export default function HomePage() {
  const featured = TEST_CENTRES.slice(0, 6);

  return (
    <>
      <JsonLd data={[organizationSchema(), websiteSchema(), faqSchema(FAQ_ITEMS)]} />
      <Hero />
      <HowItWorks />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Launch area</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">Starting with these test centres</h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                Community-reported activity, nearby alternatives and manual
                checking tips — for the centres where learners are struggling most.
              </p>
            </div>
            <Link
              href="/test-centres"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
            >
              See all centres
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((centre) => (
              <CentreCard key={centre.slug} centre={centre} />
            ))}
          </div>
        </div>
      </section>

      <SafetySection />
      <InstructorSection />
      <Faq />
      <WaitlistSection />
    </>
  );
}
