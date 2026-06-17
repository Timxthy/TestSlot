export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container-page py-12 sm:py-16">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">{title}</h1>
        {intro ? (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">{intro}</p>
        ) : null}
      </div>
    </section>
  );
}
