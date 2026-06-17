import { TEST_CENTRES } from "@testslot/shared";
import { ReportForm } from "@/components/app/ReportForm";

export const dynamic = "force-dynamic";

export default function ReportPage({
  searchParams,
}: {
  searchParams: { centre?: string };
}) {
  const centres = TEST_CENTRES.map((c) => ({ slug: c.slug, name: c.name }));
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl">Report a check</h1>
      <p className="mt-1 text-slate-600">
        Just checked GOV.UK? Tell the community what you saw — it takes 20 seconds.
      </p>
      <div className="mt-6">
        <ReportForm centres={centres} defaultCentre={searchParams.centre} />
      </div>
      <p className="mt-4 text-xs text-slate-400">
        Tip: don’t upload screenshots that show personal or booking details. We
        never ask for your licence number, theory pass or booking reference.
      </p>
    </div>
  );
}
