import { test, expect } from "@playwright/test";

// Compliance is the product's defining constraint (PRD §1, §31). These checks
// assert the mandatory trust/disclaimer copy is actually rendered, and that the
// privacy-by-design rule holds: with no analytics key configured (mock mode,
// as the E2E suite forces), no cookie banner appears and no cookie is set.
test.describe("compliance surfaces", () => {
  test("home shows the trust strip and the legal disclaimer", async ({ page }) => {
    await page.goto("/");

    // Trust strip — the five guarantees that define the positioning.
    await expect(page.getByText("No DVSA login").first()).toBeVisible();
    await expect(page.getByText("No scanning").first()).toBeVisible();

    // Footer legal disclaimer (the "not affiliated" boundary).
    await expect(page.getByText(/not affiliated with DVSA/i).first()).toBeVisible();
  });

  test("the authed app carries the community-reported data label", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText(/community reports, not live DVSA data/i).first(),
    ).toBeVisible();
  });

  test("no cookie banner when analytics is unconfigured (privacy by design)", async ({
    page,
  }) => {
    await page.goto("/");
    // <Analytics> renders nothing without NEXT_PUBLIC_POSTHOG_KEY, so the banner
    // never mounts and no non-essential cookie is set.
    await expect(
      page.getByRole("dialog", { name: /cookie consent/i }),
    ).toHaveCount(0);
    // The "Cookie settings" control also hides — there is nothing to manage.
    await expect(
      page.getByRole("button", { name: /cookie settings/i }),
    ).toHaveCount(0);

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === "tsr_analytics_consent")).toBe(false);
  });
});
