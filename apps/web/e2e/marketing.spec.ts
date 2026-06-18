import { test, expect } from "@playwright/test";

test.describe("marketing site", () => {
  test("homepage renders hero, title and CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/TestSlot Radar/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Find out where UK driving tests are appearing/i,
      }),
    ).toBeVisible();

    // Hero CTA links to the waitlist section.
    await expect(
      page.getByRole("link", { name: "Join the beta" }).first(),
    ).toBeVisible();
  });

  test("test-centres page lists tracked centres", async ({ page }) => {
    await page.goto("/test-centres");

    await expect(
      page.getByRole("heading", { name: /driving test centres/i }).first(),
    ).toBeVisible();

    // High Wycombe is the first seeded launch centre; its card links to detail.
    await expect(
      page.locator('a[href="/test-centres/high-wycombe"]').first(),
    ).toBeVisible();
  });

  test("centre detail page renders with compliance guidance", async ({
    page,
  }) => {
    await page.goto("/test-centres/high-wycombe");

    await expect(
      page.getByRole("heading", { name: /High Wycombe driving test centre/i }),
    ).toBeVisible();
    await expect(page.getByText("Manual checking tips")).toBeVisible();

    // Compliance boundary: we never book/scan — users book on GOV.UK themselves.
    await expect(
      page.getByText(
        /Only ever book or change your test on the official GOV\.UK service/i,
      ),
    ).toBeVisible();
  });
});
