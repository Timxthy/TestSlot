import { Fragment } from "react";
import { TIME_BANDS, TIME_BAND_LABELS, type HeatmapResult, type TimeBand } from "@testslot/shared";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Heatmap({ data }: { data: HeatmapResult }) {
  const count = (day: number, band: TimeBand) =>
    data.cells.find((c) => c.day === day && c.band === band)?.count ?? 0;
  const intensity = (n: number) => (data.max === 0 ? 0 : n / data.max);

  return (
    <div>
      <div
        className="grid gap-1 text-xs"
        style={{ gridTemplateColumns: "5.5rem repeat(7, minmax(0, 1fr))" }}
      >
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-slate-500">
            {d}
          </div>
        ))}

        {TIME_BANDS.map((band) => (
          <Fragment key={band}>
            <div className="flex items-center pr-2 text-slate-500">
              {TIME_BAND_LABELS[band]}
            </div>
            {DAYS.map((_, day) => {
              const n = count(day, band);
              const a = intensity(n);
              return (
                <div
                  key={day}
                  title={`${DAYS[day]} ${TIME_BAND_LABELS[band]}: ${n} report${n === 1 ? "" : "s"}`}
                  className="aspect-square rounded-md ring-1 ring-inset ring-slate-200"
                  style={{ backgroundColor: `rgba(13, 148, 136, ${(0.08 + a * 0.92).toFixed(3)})` }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Darker = more availability reports. Last 14 days.
      </p>
    </div>
  );
}
