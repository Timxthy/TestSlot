"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/report", label: "Submit report" },
  { href: "/cancellations", label: "Cancellations" },
  { href: "/settings", label: "Reminders" },
];

const adminLink = { href: "/admin", label: "Admin" };

export function AppNav({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname();
  const links = showAdmin ? [...baseLinks, adminLink] : baseLinks;
  return (
    <nav className="flex flex-wrap gap-1" aria-label="App">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
