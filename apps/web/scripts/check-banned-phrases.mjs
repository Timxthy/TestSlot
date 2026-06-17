#!/usr/bin/env node
/**
 * Compliance lint (PRD §31): fail the build if any banned marketing/UI phrase
 * appears in the web app source. Single source of truth for the phrase list is
 * packages/shared/src/banned-phrases.json.
 *
 * Note: only apps/web/{app,components,lib} are scanned — the shared package is
 * deliberately excluded so scam-example data there is not mistaken for a claim.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const bannedPath = path.join(
  repoRoot,
  "packages",
  "shared",
  "src",
  "banned-phrases.json",
);

const SCAN_DIRS = ["app", "components", "lib"].map((d) => path.join(webRoot, d));
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx", ".md"]);

async function walk(dir) {
  let files = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files = files.concat(await walk(full));
    } else if (EXTS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const banned = JSON.parse(await fs.readFile(bannedPath, "utf8"));
const files = (await Promise.all(SCAN_DIRS.map(walk))).flat();

const hits = [];
for (const file of files) {
  const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    for (const phrase of banned) {
      if (lower.includes(phrase.toLowerCase())) {
        hits.push({
          file: path.relative(repoRoot, file),
          line: i + 1,
          phrase,
          text: line.trim(),
        });
      }
    }
  });
}

if (hits.length > 0) {
  console.error(`\n✖ Compliance check failed — ${hits.length} banned phrase(s) found:\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  →  "${h.phrase}"`);
    console.error(`     ${h.text}`);
  }
  console.error("\nThese phrases are not allowed in marketing/UI copy (PRD §31).\n");
  process.exit(1);
}

console.log(`✓ Compliance check passed — scanned ${files.length} files, no banned phrases.`);
