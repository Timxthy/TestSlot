export const HOW_IT_WORKS_STEPS = [
  {
    title: "Follow your local test centres",
    body: "Pick the centres that work for you — your area plus realistic alternatives nearby.",
  },
  {
    title: "Check GOV.UK yourself",
    body: "When you check, open the official booking service in your own browser. We never touch it for you.",
  },
  {
    title: "Share what you saw",
    body: "Takes 20 seconds: tests showing, nothing, a cancellation, a long queue. Your report helps everyone.",
  },
  {
    title: "Get community alerts",
    body: "When several learners report activity at a centre you follow, you’ll know it’s worth a look.",
  },
  {
    title: "Book or change it yourself on GOV.UK",
    body: "Only you can book, change, cancel or swap your test. We point you there — you do it.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-2xl text-3xl sm:text-4xl">
          Manual checking, made smarter by the community
        </h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <li key={step.title} className="card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
