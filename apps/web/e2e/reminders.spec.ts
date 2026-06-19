import { test, expect } from "@playwright/test";

/**
 * Task 5: reminder preferences. In mock mode the settings page renders the
 * default times and saving round-trips through /api/reminders (the mock store),
 * so this verifies the preferences loop without needing VAPID / a real browser
 * push subscription.
 */
test("a learner can edit and save reminder times", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Check reminders" })).toBeVisible();

  const firstTime = page.getByLabel("Reminder time 1");
  await expect(firstTime).toBeVisible();
  await firstTime.fill("07:15");

  await page.getByRole("button", { name: "Save reminders" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
});
