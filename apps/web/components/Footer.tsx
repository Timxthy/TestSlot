import Link from "next/link";
import { LEGAL_DISCLAIMER } from "@testslot/shared";
import { RadarMark } from "@/components/icons";
import { ManageCookies } from "@/components/analytics/ManageCookies";

const footerNav = [
  {
    heading: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/test-centres", label: "Test centres" },
      { href: "/#waitlist", label: "Join the beta" },
    ],
  },
  {
    heading: "Safety",
    links: [
      { href: "/safety", label: "Staying safe" },
      { href: "/for-instructors", label: "For instructors" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 text-ink">
              <RadarMark className="h-6 w-6 text-brand-600" />
              <span className="font-semibold tracking-tight">TestSlot Radar</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Community-reported UK driving test availability. You check GOV.UK
              yourself — we help you know where and when it’s worth looking.
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-ink">{col.heading}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-xs leading-relaxed text-slate-500">{LEGAL_DISCLAIMER}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} TestSlot Radar. Not affiliated with DVSA,
              DVLA or GOV.UK.
            </p>
            <ManageCookies />
          </div>
        </div>
      </div>
    </footer>
  );
}
