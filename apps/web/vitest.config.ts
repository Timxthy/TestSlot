import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the web app's pure logic (analytics gating, consent, realtime).
// Scoped to lib/**/*.test.ts so it never picks up the Playwright e2e specs
// (e2e/*.spec.ts), which vitest's default glob would otherwise match.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
