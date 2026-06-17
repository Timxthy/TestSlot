import type { MetadataRoute } from "next";
import { TEST_CENTRES } from "@testslot/shared";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    "",
    "/how-it-works",
    "/test-centres",
    "/safety",
    "/for-instructors",
    "/privacy",
    "/terms",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  const centreEntries: MetadataRoute.Sitemap = TEST_CENTRES.map((centre) => ({
    url: `${siteUrl}/test-centres/${centre.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticEntries, ...centreEntries];
}
