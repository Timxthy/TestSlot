"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { cancellationInputSchema, type CancellationInput } from "@testslot/shared";

const checkboxes = [
  { name: "noPayment", label: "I will not ask for or accept payment for a slot." },
  { name: "noPersonalDetails", label: "I will not ask for anyone’s licence, theory or booking details." },
  { name: "understandsSelfBooking", label: "I understand others must book/change on GOV.UK themselves." },
] as const;

export function CancellationForm({ centres }: { centres: { slug: string; name: string }[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CancellationInput>({
    resolver: zodResolver(cancellationInputSchema),
    defaultValues: { centreSlug: centres[0]?.slug },
  });
  const [result, setResult] = useState<{ flagged: boolean } | null>(null);

  async function onSubmit(values: CancellationInput) {
    const res = await fetch("/api/cancellations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      const data = await res.json();
      setResult({ flagged: Boolean(data.flagged) });
      reset({ centreSlug: values.centreSlug });
      router.refresh();
    }
  }

  if (result) {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="font-semibold text-ink">
          {result.flagged ? "Sent for review" : "Posted to the board"}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {result.flagged
            ? "Your post looked like it might break the rules, so a moderator will check it before it goes live."
            : "Thanks — others can now see your planned cancellation."}
        </p>
        <button type="button" onClick={() => setResult(null)} className="btn-secondary mt-3 text-sm">
          Post another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Do not sell slots or ask for personal details. Everyone must book or
        change their own test on GOV.UK.
      </p>

      <div>
        <label htmlFor="c-centre" className="block text-sm font-medium text-slate-700">
          Centre
        </label>
        <select id="c-centre" className="input mt-1.5" {...register("centreSlug")}>
          {centres.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="c-when" className="block text-sm font-medium text-slate-700">
          When do you plan to cancel?
        </label>
        <input id="c-when" type="datetime-local" className="input mt-1.5" {...register("plannedCancelAt")} />
        {errors.plannedCancelAt ? (
          <p className="mt-1 text-sm text-rose-600">{errors.plannedCancelAt.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="c-month" className="block text-sm font-medium text-slate-700">
          Test month (optional)
        </label>
        <input
          id="c-month"
          type="month"
          className="input mt-1.5"
          {...register("testMonth", { setValueAs: (v) => (v === "" ? undefined : v) })}
        />
      </div>

      <div>
        <label htmlFor="c-note" className="block text-sm font-medium text-slate-700">
          Note (optional)
        </label>
        <textarea id="c-note" rows={2} className="input mt-1.5" {...register("note")} />
        {errors.note ? <p className="mt-1 text-sm text-rose-600">{errors.note.message}</p> : null}
      </div>

      <fieldset className="space-y-2">
        {checkboxes.map((cb) => (
          <label key={cb.name} className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" {...register(cb.name)} />
            <span>{cb.label}</span>
          </label>
        ))}
        {errors.noPayment || errors.noPersonalDetails || errors.understandsSelfBooking ? (
          <p className="text-sm text-rose-600">
            {errors.noPayment?.message ??
              errors.noPersonalDetails?.message ??
              errors.understandsSelfBooking?.message}
          </p>
        ) : null}
      </fieldset>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? "Posting…" : "Post cancellation"}
      </button>
    </form>
  );
}
