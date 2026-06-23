import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/analytics/Analytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TestSlot Radar — community-reported UK driving test availability",
    template: "%s · TestSlot Radar",
  },
  description:
    "Find out where UK driving tests are appearing, without giving anyone your DVSA details. Community-reported availability patterns, manual check reminders, and safer cancellation announcements.",
  applicationName: "TestSlot Radar",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "TestSlot Radar",
    title: "TestSlot Radar — community-reported UK driving test availability",
    description:
      "Community-reported availability patterns and manual check reminders. No DVSA login, no licence number, no scanning.",
    url: siteUrl,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "TestSlot Radar",
    description:
      "Community-reported UK driving test availability. No DVSA login, no licence number, no scanning.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
