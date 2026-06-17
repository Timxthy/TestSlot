"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  AVAILABILITY_TYPES,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  TIME_BANDS,
  TIME_BAND_LABELS,
  reportInputSchema,
  type ReportInput,
} from "@testslot/shared";

export function ReportForm({
  centres,
  defaultCentre,
}: {
  centres: { slug: string; name: string }[];
  defaultCentre?: string;
}) {
  const router = useRouter();
  const initialCentre =
    defaultCentre && centres.some((c) => c.slug === defaultCentre)
      ? defaultCentre
      : centres[0]?.slug;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportInput>({
    resolver: zodResolver(reportInputSchema),
    defaultValues: { centreSlug: initialCentre },
  });

  const [doneSlug, setDoneSlug] = useState<string | null>(null);
  const type = watch("type");
  const showAvailability = Boolean(type && AVAILABILITY_TYPES.includes(type));

  async function onSubmit(values: ReportInput) {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setDoneSlug(values.centreSlug);
      reset({ centreSlug: values.centreSlug });
      router.refresh();
    }
  }

  if (doneSlug) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
          ✓
        </div>
        <h2 className="mt-3 text-xl">Thanks — report logged</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your report helps other learners know when to check.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href={`/centres/${doneSlug}`} className="btn-secondary">
            View centre
          </Link>
          <button type="button" onClick={() => setDoneSlug(null)} className="btn-primary">
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6 p-6">
      <div>
        <label htmlFor="centreSlug" className="block text-sm font-medium text-slate-700">
          Which centre?
        </label>
        <select id="centreSlug" className="input mt-1.5" {...register("centreSlug")}>
          {centres.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">
          What did you see on GOV.UK?
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_TYPES.map((rt) => (
            <label
              key={rt}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800"
            >
              <input type="radio" value={rt} className="accent-brand-600" {...register("type")} />
              {REPORT_TYPE_LABELS[rt]}
            </label>
          ))}
        </div>
        {errors.type ? (
          <p className="mt-1 text-sm text-rose-600">{errors.type.message}</p>
        ) : null}
      </div>

      {showAvailability ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="earliestMonth" className="block text-sm font-medium text-slate-700">
              Earliest month seen (optional)
            </label>
            <input
              id="earliestMonth"
              type="month"
              className="input mt-1.5"
              {...register("earliestMonth", { setValueAs: (v) => (v === "" ? undefined : v) })}
            />
          </div>
          <div>
            <label htmlFor="timeBand" className="block text-sm font-medium text-slate-700">
              Time of day (optional)
            </label>
            <select
              id="timeBand"
              className="input mt-1.5"
              defaultValue=""
              {...register("timeBand", { setValueAs: (v) => (v === "" ? undefined : v) })}
            >
              <option value="">Any</option>
              {TIME_BANDS.map((b) => (
                <option key={b} value={b}>
                  {TIME_BAND_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-slate-700">
          Note (optional)
        </label>
        <textarea
          id="note"
          rows={2}
          className="input mt-1.5"
          placeholder="Anything useful for other learners"
          {...register("note")}
        />
        {errors.note ? (
          <p className="mt-1 text-sm text-rose-600">{errors.note.message}</p>
        ) : null}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Submitting…" : "Submit community report"}
      </button>
    </form>
  );
}
