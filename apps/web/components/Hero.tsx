import Link from "next/link";
import { TrustStrip } from "@/components/TrustStrip";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-[460px] w-[460px] opacity-[0.13]"
      >
        <svg viewBox="0 0 460 460" fill="none" className="h-full w-full text-brand-600">
          <circle cx="230" cy="230" r="220" stroke="currentColor" strokeWidth="2" />
          <circle cx="230" cy="230" r="160" stroke="currentColor" strokeWidth="2" />
          <circle cx="230" cy="230" r="100" stroke="currentColor" strokeWidth="2" />
          <circle cx="230" cy="230" r="44" stroke="currentColor" strokeWidth="2" />
          <path d="M230 230 410 110" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      <div className="container-page relative py-16 sm:py-24">
        <p className="eyebrow">Community-powered test availability</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
          Find out where UK driving tests are appearing, without giving anyone
          your DVSA details.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Community-reported availability patterns, manual check reminders, and
          safer cancellation announcements. You check GOV.UK yourself — we help
          you know where and when it’s worth looking.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="#waitlist" className="btn-primary">
            Join the beta
          </Link>
          <Link href="/how-it-works" className="btn-secondary">
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Free to join · Email &amp; postcode area only · No licence details ever
        </p>
      </div>

      <TrustStrip />
    </section>
  );
}
