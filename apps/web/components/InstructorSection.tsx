import Link from "next/link";

export function InstructorSection() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="card overflow-hidden">
          <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="eyebrow">For driving instructors</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">
                Help pupils coordinate cancellations — without breaking the rules
              </h2>
              <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
                Post when a pupil plans to cancel so local learners can check
                GOV.UK themselves. No booking on anyone’s behalf, no payment for
                slots, no handling of DVSA details — just a safer local board.
              </p>
              <Link href="/for-instructors" className="btn-primary mt-6">
                Instructor info
              </Link>
            </div>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="card p-4">Verified instructor badge after manual review</li>
              <li className="card p-4">Announce planned cancellations to local learners</li>
              <li className="card p-4">See community-reported activity across your centres</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
