import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { ReminderSettings } from "@/components/app/ReminderSettings";
import { AccountDataControls } from "@/components/app/AccountDataControls";
import { GovUkLink } from "@/components/GovUkLink";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const prefs = await getStore().getReminderPreferences(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Check reminders</h1>
        <p className="mt-1 text-slate-600">
          Choose when we nudge you to check GOV.UK for test availability yourself.
        </p>
      </div>

      <div className="card max-w-xl p-6">
        <ReminderSettings initial={prefs} />
      </div>

      <div className="card max-w-xl p-5">
        <h2 className="text-lg">Ready to check now?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Reminders never include live availability — open GOV.UK and check
          yourself.
        </p>
        <div className="mt-3">
          <GovUkLink />
        </div>
      </div>

      <div className="card max-w-xl p-6">
        <h2 className="text-lg">Your data</h2>
        <p className="mt-1 text-sm text-slate-600">
          Export or delete the personal data we hold about you (GDPR).
        </p>
        <div className="mt-4">
          <AccountDataControls />
        </div>
      </div>
    </div>
  );
}
