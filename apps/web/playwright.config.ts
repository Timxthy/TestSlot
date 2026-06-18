import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the TestSlot Radar web app.
 *
 * Tests run in MOCK MODE: the four Supabase env vars are forced empty so that
 * `@next/env` won't pull live values from `.env.local` (it only fills vars that
 * are `undefined`, and "" is defined). This keeps the suite deterministic and
 * offline — no real auth, no live DB. See lib/supabase/config.ts.
 *
 * A dedicated port (3100) avoids clashing with a `pnpm dev` server on :3000.
 */
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    // Playwright merges these over the inherited process.env. Empty strings
    // force mock mode regardless of what's in .env.local.
    env: {
      SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
