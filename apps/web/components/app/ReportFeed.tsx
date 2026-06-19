import {
  AVAILABILITY_TYPES,
  REPORT_TYPE_LABELS,
  type AvailabilityReport,
  type ReportType,
} from "@testslot/shared";
import { formatMonth, timeAgo } from "@/lib/format";
import { ConfirmControl } from "./ConfirmControl";

const typeTone: Record<ReportType, string> = {
  tests_available: "bg-emerald-50 text-emerald-700",
  cancellation_seen: "bg-emerald-50 text-emerald-700",
  no_tests_found: "bg-slate-100 text-slate-600",
  queue_too_long: "bg-amber-50 text-amber-700",
  govuk_error: "bg-amber-50 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};

export function ReportFeed({
  reports,
  confirmations = {},
}: {
  reports: AvailabilityReport[];
  confirmations?: Record<string, boolean>;
}) {
  if (reports.length === 0) {
    return <p className="text-sm text-slate-500">No reports yet for this centre.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {reports.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${typeTone[r.type]}`}>
              {REPORT_TYPE_LABELS[r.type]}
            </span>
            {r.earliestMonth ? (
              <span className="text-sm text-slate-600">
                earliest {formatMonth(r.earliestMonth)}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {AVAILABILITY_TYPES.includes(r.type) ? (
              <ConfirmControl reportId={r.id} initial={confirmations[r.id]} />
            ) : null}
            <span className="text-xs text-slate-400">{timeAgo(r.checkedAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
