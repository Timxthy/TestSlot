import Link from "next/link";
import type { TestCentre } from "@testslot/shared";
import { ArrowRightIcon } from "@/components/icons";

export function CentreCard({ centre }: { centre: TestCentre }) {
  return (
    <Link
      href={`/test-centres/${centre.slug}`}
      className="card group block p-5 transition hover:border-brand-300 hover:shadow-md"
    >
      <h3 className="text-lg">{centre.name}</h3>
      <p className="mt-0.5 text-sm text-slate-500">
        {centre.county} · {centre.postcodeArea}
      </p>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
        {centre.blurb}
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
        View centre
        <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
