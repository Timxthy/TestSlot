import Link from "next/link";
import { RadarMark } from "@/components/icons";
import { HeaderCta } from "@/components/HeaderCta";

const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/test-centres", label: "Test centres" },
  { href: "/safety", label: "Safety" },
  { href: "/for-instructors", label: "Instructors" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <RadarMark className="h-7 w-7 text-brand-600" />
          <span className="text-lg font-semibold tracking-tight">TestSlot Radar</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <HeaderCta />
        </div>
      </div>
    </header>
  );
}
