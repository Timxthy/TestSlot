#!/usr/bin/env node

const processors = ["Supabase", "Resend", "PostHog", "Sentry"];

const blockers = [];
if (!process.env.LEGAL_REVIEWED_AT?.trim()) {
  blockers.push("Solicitor-reviewed Privacy and Terms are not recorded.");
}
if (!process.env.DPIA_SIGNED_OFF_AT?.trim()) {
  blockers.push("DPIA sign-off is not recorded.");
}
if (!process.env.PROCESSOR_AGREEMENTS_SIGNED_OFF_AT?.trim()) {
  blockers.push(
    `Processor agreements are not recorded for ${processors.slice(0, -1).join(", ")} and ${processors.at(-1)}.`,
  );
}

if (blockers.length > 0) {
  console.error("\n✖ Public launch readiness check failed:\n");
  for (const blocker of blockers) console.error(`  - ${blocker}`);
  console.error(
    "\nRecord the evidence in docs/launch-readiness.md, then set the matching *_AT environment variables for the launch verification run.\n",
  );
  process.exit(1);
}

console.log("✓ Public launch readiness check passed.");
