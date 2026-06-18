import { test, expect } from "@playwright/test";

/**
 * In mock mode `requireUser()` returns DEMO_USER, so the authenticated app
 * shell renders without a real session instead of redirecting to /login.
 * (The login-redirect path only exists in live Supabase mode.)
 */
test("dashboard renders the app shell for the demo user in mock mode", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Demo Learner")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /TestSlot Radar/ }).first(),
  ).toBeVisible();
});
