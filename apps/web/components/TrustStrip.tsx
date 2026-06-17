import { TRUST_STRIP } from "@testslot/shared";
import { CheckIcon } from "@/components/icons";

/** The five guarantees that define the product (PRD §32 trust strip). */
export function TrustStrip() {
  return (
    <div className="border-y border-slate-200 bg-white">
      <ul className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4">
        {TRUST_STRIP.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
