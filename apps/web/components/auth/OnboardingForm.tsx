"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEST_CENTRES } from "@testslot/shared";

export function OnboardingForm() {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcodeArea: postcode, centres: selected }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h1 className="text-2xl">Get set up</h1>
      <p className="mt-1 text-sm text-slate-600">
        Tell us your area and pick the centres you want to follow.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-slate-700">
            Postcode area
          </label>
          <input
            id="postcode"
            type="text"
            required
            placeholder="HP13"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="input mt-1.5 uppercase"
          />
          <p className="mt-1 text-xs text-slate-500">Area only, e.g. HP13 — not your full postcode.</p>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700">Follow centres</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TEST_CENTRES.map((c) => {
              const on = selected.includes(c.slug);
              return (
                <button
                  type="button"
                  key={c.slug}
                  onClick={() => toggle(c.slug)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    on
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Saving…" : "Go to dashboard"}
        </button>
      </form>
    </div>
  );
}
