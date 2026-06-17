import Link from "next/link";
import { COMMUNITY_DATA_LABEL } from "@testslot/shared";
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app/AppNav";
import { LogoutButton } from "@/components/app/LogoutButton";
import { NotificationBell } from "@/components/app/NotificationBell";
import { RadarMark } from "@/components/icons";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-ink">
              <RadarMark className="h-7 w-7 text-brand-600" />
              <span className="font-semibold tracking-tight">TestSlot Radar</span>
            </Link>
            <div className="hidden sm:block">
              <AppNav />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-slate-500 sm:inline">{user.name}</span>
            <LogoutButton />
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="border-t border-slate-200 sm:hidden">
          <div className="container-page py-2">
            <AppNav />
          </div>
        </div>
      </header>

      <main className="container-page py-8">{children}</main>

      <footer className="container-page pb-10 pt-2">
        <p className="text-xs text-slate-400">
          {COMMUNITY_DATA_LABEL} TestSlot Radar is not affiliated with DVSA, DVLA
          or GOV.UK — you book and manage your own test on GOV.UK.
        </p>
      </footer>
    </div>
  );
}
