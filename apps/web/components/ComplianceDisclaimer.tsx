import { LEGAL_DISCLAIMER } from "@testslot/shared";

/** Reusable legal-boundary banner for key pages (PRD §6.4). */
export function ComplianceDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600 ${className}`}
    >
      <span className="font-semibold text-slate-700">Important:</span>{" "}
      {LEGAL_DISCLAIMER}
    </p>
  );
}
