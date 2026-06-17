import Link from "next/link";
import { NEVER_SHARE, SAFETY_MESSAGE } from "@testslot/shared";
import { ShieldIcon } from "@/components/icons";

export function SafetySection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page grid items-start gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Anti-scam by design</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Built to keep you safe from test-slot scams
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-slate-600">
            {SAFETY_MESSAGE}
          </p>
          <Link href="/safety" className="btn-secondary mt-6">
            Read the safety guide
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 text-brand-700">
            <ShieldIcon className="h-5 w-5" />
            <h3 className="text-lg">Never share or pay for these</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {NEVER_SHARE.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
