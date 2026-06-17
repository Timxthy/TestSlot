export const FAQ_ITEMS = [
  {
    q: "Is this a cancellation scanner?",
    a: "No. TestSlot Radar never scans, polls or logs into the DVSA booking service. Everything you see comes from learners and verified instructors who checked GOV.UK themselves and shared what they saw.",
  },
  {
    q: "Is it allowed under the 2026 DVSA rules?",
    a: "We’re built around the rules. Only you can book, change, cancel or swap your own test on GOV.UK, and we never do that for you or store your DVSA details. We are not affiliated with or endorsed by DVSA.",
  },
  {
    q: "Do you book tests for me?",
    a: "Never. We point you to the official GOV.UK service and you do everything there yourself.",
  },
  {
    q: "What information do you collect?",
    a: "As little as possible — your email and postcode area, to match you to local centres. We never ask for your licence number, theory pass number, booking reference or GOV.UK login.",
  },
  {
    q: "Does it cost anything?",
    a: "Joining the beta is free. A future premium tier may add faster community alerts, but we’ll never sell test slots or charge for promises we can’t keep.",
  },
] as const;

export function Faq() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page max-w-3xl">
        <p className="eyebrow">Questions</p>
        <h2 className="mt-3 text-3xl sm:text-4xl">Frequently asked</h2>
        <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-ink">
                {item.q}
                <span className="text-brand-600 transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
