#!/usr/bin/env node
/**
 * Positive compliance lint (PRD §19 DoD, §20 "manual check that key pages carry
 * disclaimer + trust messaging"). Where check-banned-phrases.mjs proves bad copy
 * is ABSENT, this proves the mandatory trust/compliance copy is PRESENT — so a
 * refactor can't silently drop the "community-reported, not live DVSA data"
 * label, the legal disclaimer, the trust strip, or the safety messaging.
 *
 * Each rule passes if the file references ANY of its tokens (the shared constant
 * name or a literal fragment). It deliberately checks source references rather
 * than rendered output so it can run in CI without a browser.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

/** @type {{ file: string; label: string; anyOf: string[] }[]} */
const RULES = [
  {
    file: "components/Footer.tsx",
    label: "Footer legal disclaimer",
    anyOf: ["LEGAL_DISCLAIMER"],
  },
  {
    file: "components/Footer.tsx",
    label: "Footer 'not affiliated with DVSA' notice",
    anyOf: ["Not affiliated with DVSA", "not affiliated with DVSA"],
  },
  {
    file: "components/TrustStrip.tsx",
    label: "Home trust strip (the five guarantees)",
    anyOf: ["TRUST_STRIP"],
  },
  {
    file: "app/(app)/layout.tsx",
    label: "App chrome community-data label",
    anyOf: ["COMMUNITY_DATA_LABEL"],
  },
  {
    file: "app/(app)/centres/[slug]/page.tsx",
    label: "Centre status community-data label",
    anyOf: ["COMMUNITY_DATA_LABEL"],
  },
  {
    file: "app/(marketing)/safety/page.tsx",
    label: "Safety page scam education",
    anyOf: ["SCAM_WARNING_SIGNS", "NEVER_SHARE", "SAFETY_MESSAGE"],
  },
];

const failures = [];
for (const rule of RULES) {
  const abs = path.join(webRoot, rule.file);
  let content;
  try {
    content = await fs.readFile(abs, "utf8");
  } catch {
    failures.push(`${rule.file} — missing file (expected: ${rule.label})`);
    continue;
  }
  if (!rule.anyOf.some((token) => content.includes(token))) {
    failures.push(
      `${rule.file} — ${rule.label} not found (expected one of: ${rule.anyOf.join(", ")})`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    `\n✖ Required-copy check failed — ${failures.length} compliance surface(s) missing:\n`,
  );
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    "\nKey pages must always carry the community-data label, legal disclaimer, " +
      "trust strip and safety messaging (PRD §19/§20).\n",
  );
  process.exit(1);
}

console.log(
  `✓ Required-copy check passed — ${RULES.length} compliance surfaces present.`,
);
