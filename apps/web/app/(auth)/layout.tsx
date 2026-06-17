import Link from "next/link";
import { RadarMark } from "@/components/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-page flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <RadarMark className="h-7 w-7 text-brand-600" />
          <span className="font-semibold tracking-tight">TestSlot Radar</span>
        </Link>
      </div>
      <div className="mx-auto w-full max-w-md px-4 py-10">{children}</div>
    </div>
  );
}
