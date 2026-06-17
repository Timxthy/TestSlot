"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { waitlistSchema, type WaitlistInput } from "@testslot/shared";

const roleOptions = [
  { value: "learner", label: "Learner driver" },
  { value: "instructor", label: "Driving instructor" },
  { value: "parent", label: "Parent / supervising driver" },
];

export function WaitlistForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistInput>({
    resolver: zodResolver(waitlistSchema),
  });

  const [server, setServer] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  async function onSubmit(values: WaitlistInput) {
    setServer(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServer({ ok: false, message: data.error ?? "Something went wrong." });
        return;
      }
      setServer({ ok: true, message: data.message });
      reset();
    } catch {
      setServer({ ok: false, message: "Network error. Please try again." });
    }
  }

  if (server?.ok) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-brand-200 bg-white p-8 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-2xl text-brand-700">
          ✓
        </div>
        <h3 className="mt-4 text-xl">{server.message}</h3>
        <p className="mt-2 text-sm text-slate-600">
          We’ll only email you about TestSlot Radar. No spam, ever.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-2xl bg-white p-6 shadow-card sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" error={errors.email?.message} className="sm:col-span-2">
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            className="input"
            {...register("email")}
          />
        </Field>

        <Field label="Postcode area" htmlFor="postcodeArea" error={errors.postcodeArea?.message} hint="Area only, e.g. HP13 — not your full postcode.">
          <input
            id="postcodeArea"
            type="text"
            autoCapitalize="characters"
            placeholder="HP13"
            aria-invalid={Boolean(errors.postcodeArea)}
            className="input uppercase"
            {...register("postcodeArea")}
          />
        </Field>

        <Field label="I am a… (optional)" htmlFor="role" error={errors.role?.message}>
          <select
            id="role"
            className="input"
            defaultValue=""
            {...register("role", {
              setValueAs: (v) => (v === "" ? undefined : v),
            })}
          >
            <option value="">Prefer not to say</option>
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          aria-invalid={Boolean(errors.consented)}
          {...register("consented")}
        />
        <span>
          I agree to TestSlot Radar emailing me about the beta, and I’ve read how
          my email and postcode area are used. We never ask for DVSA details.
        </span>
      </label>
      {errors.consented?.message ? (
        <p className="mt-1 text-sm text-rose-600">{errors.consented.message}</p>
      ) : null}

      {server && !server.ok ? (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {server.message}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting} className="btn-primary mt-5 w-full">
        {isSubmitting ? "Joining…" : "Join the beta"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
