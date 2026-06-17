import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { WaitlistEntry, WaitlistInput } from "@testslot/shared";

/**
 * Waitlist persistence (PRD Phase 0).
 *
 * - Production: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → writes to a
 *   `waitlist` table via the Supabase REST API (no extra dependency).
 * - Local dev (default): appends to apps/web/.data/waitlist.json (gitignored)
 *   so the form works end-to-end with zero setup.
 *
 * Only ever stores the minimised fields (email + postcode area + optional role).
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "waitlist.json");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(supabaseUrl && supabaseKey);

export type SaveResult =
  | { status: "created"; entry: WaitlistEntry }
  | { status: "duplicate" };

export async function saveWaitlistEntry(
  input: WaitlistInput,
): Promise<SaveResult> {
  return useSupabase ? saveToSupabase(input) : saveToLocalFile(input);
}

function toEntry(input: WaitlistInput): WaitlistEntry {
  return { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
}

async function saveToLocalFile(input: WaitlistInput): Promise<SaveResult> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  let entries: WaitlistEntry[] = [];
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    entries = JSON.parse(raw) as WaitlistEntry[];
  } catch {
    entries = [];
  }

  if (entries.some((e) => e.email === input.email)) {
    return { status: "duplicate" };
  }

  const entry = toEntry(input);
  entries.push(entry);
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");
  return { status: "created", entry };
}

async function saveToSupabase(input: WaitlistInput): Promise<SaveResult> {
  const base = `${supabaseUrl}/rest/v1/waitlist`;
  const headers = {
    apikey: supabaseKey as string,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };

  // De-dupe by email.
  const existing = await fetch(
    `${base}?email=eq.${encodeURIComponent(input.email)}&select=id`,
    { headers },
  );
  if (existing.ok) {
    const rows = (await existing.json()) as unknown[];
    if (Array.isArray(rows) && rows.length > 0) {
      return { status: "duplicate" };
    }
  }

  const entry = toEntry(input);
  const res = await fetch(base, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      id: entry.id,
      email: entry.email,
      postcode_area: entry.postcodeArea,
      role: entry.role ?? null,
      interested_centres: entry.interestedCentres ?? null,
      consented: entry.consented,
      created_at: entry.createdAt,
    }),
  });

  if (!res.ok) {
    // 23505 = unique violation (race with the dedupe check above).
    const text = await res.text();
    if (res.status === 409 || text.includes("23505")) {
      return { status: "duplicate" };
    }
    throw new Error(`Supabase insert failed (${res.status}): ${text}`);
  }

  return { status: "created", entry };
}
