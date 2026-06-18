import { test, expect } from "@playwright/test";

test("waitlist sign-up shows the success state", async ({ page }) => {
  await page.goto("/#waitlist");

  // Unique email per run so the fs-fallback store never returns "duplicate".
  const email = `e2e+${Date.now()}@example.com`;

  // Exact labels: the consent checkbox's sentence also contains "email" and
  // "postcode area", so a substring match would resolve to two elements.
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Postcode area", { exact: true }).fill("HP13");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Join the beta/i }).click();

  // On success the form is replaced by a role="status" confirmation panel.
  const status = page.getByRole("status");
  await expect(status).toBeVisible();
  await expect(status).toContainText(/on the list/i);
});

test("waitlist rejects an empty submission with validation errors", async ({
  page,
}) => {
  await page.goto("/#waitlist");

  await page.getByRole("button", { name: /Join the beta/i }).click();

  // Client-side zod validation blocks submit; no success panel appears.
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Join the beta/i })).toBeVisible();
});
