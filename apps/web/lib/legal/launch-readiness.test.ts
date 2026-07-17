import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(
  new URL("../../scripts/check-launch-readiness.mjs", import.meta.url),
);

function launchCheck(evidence = false) {
  const env = { ...process.env };
  delete env.LEGAL_REVIEWED_AT;
  delete env.DPIA_SIGNED_OFF_AT;
  delete env.PROCESSOR_AGREEMENTS_SIGNED_OFF_AT;

  if (evidence) {
    env.LEGAL_REVIEWED_AT = "2026-06-27";
    env.DPIA_SIGNED_OFF_AT = "2026-06-27";
    env.PROCESSOR_AGREEMENTS_SIGNED_OFF_AT = "2026-06-27";
  }

  return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
}

describe("public launch readiness script", () => {
  it("blocks launch until the external evidence is recorded", () => {
    const result = launchCheck();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Solicitor-reviewed Privacy and Terms");
    expect(result.stderr).toContain("DPIA sign-off");
    expect(result.stderr).toContain("Supabase, Resend, PostHog and Sentry");
  });

  it("passes only when all three evidence records are present", () => {
    const result = launchCheck(true);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Public launch readiness check passed");
  });
});
