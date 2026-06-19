import { test, expect } from "@playwright/test";

/**
 * Task 4: the "still there / not there" confirmation loop. high-wycombe is an
 * "active now" seed centre, so its recent feed has availability reports that
 * carry the confirm control. Clicking posts to /api/confirmations; if that POST
 * failed the optimistic state would revert, so a sticky aria-pressed proves the
 * round-trip worked (mock mode, demo user).
 */
test("a learner can confirm a report is still showing", async ({ page }) => {
  await page.goto("/centres/high-wycombe");

  await expect(page.getByRole("heading", { name: "Recent reports" })).toBeVisible();

  const stillThere = page.getByRole("button", { name: "Still there" }).first();
  await expect(stillThere).toBeVisible();
  await expect(stillThere).toHaveAttribute("aria-pressed", "false");

  await stillThere.click();
  await expect(stillThere).toHaveAttribute("aria-pressed", "true");
});
