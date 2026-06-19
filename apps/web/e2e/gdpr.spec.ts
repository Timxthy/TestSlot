import { test, expect } from "@playwright/test";

/**
 * Task 6: GDPR data controls. Read-only checks (no delete — that would mutate the
 * shared mock store for parallel specs).
 */
test("settings exposes export + delete controls", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Your data" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Download my data/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete my account" })).toBeVisible();
});

test("data export returns the user's data as JSON", async ({ request }) => {
  const res = await request.get("/api/account/export");
  expect(res.status()).toBe(200);
  const body = await res.json();
  for (const key of ["profile", "follows", "reports", "cancellations", "reminderPreferences"]) {
    expect(body).toHaveProperty(key);
  }
});
