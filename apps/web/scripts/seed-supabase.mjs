#!/usr/bin/env node
/**
 * Seed a connected Supabase project so the DB-backed app renders populated.
 * Creates auth users (Admin API) + profiles to satisfy FKs, then upserts
 * centres and inserts synthetic reports / follows / cancellations.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
 * Idempotent: clears reports/cancellations and re-seeds; users/profiles upserted.
 */
const SB_URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SECRET) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const REST = `${SB_URL}/rest/v1`;
const AUTHA = `${SB_URL}/auth/v1/admin`;
const h = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };

const CENTRES = [
  { slug: "high-wycombe", name: "High Wycombe", county: "Buckinghamshire", postcode_area: "HP13" },
  { slug: "aylesbury", name: "Aylesbury", county: "Buckinghamshire", postcode_area: "HP19" },
  { slug: "slough", name: "Slough", county: "Berkshire", postcode_area: "SL1" },
  { slug: "reading", name: "Reading", county: "Berkshire", postcode_area: "RG2" },
  { slug: "uxbridge", name: "Uxbridge", county: "Greater London (Hillingdon)", postcode_area: "UB8" },
  { slug: "greenford", name: "Greenford", county: "Greater London (Ealing)", postcode_area: "UB6" },
  { slug: "watford", name: "Watford", county: "Hertfordshire", postcode_area: "WD18" },
  { slug: "bletchley", name: "Bletchley (Milton Keynes)", county: "Buckinghamshire", postcode_area: "MK2" },
  { slug: "oxford", name: "Oxford (Cowley)", county: "Oxfordshire", postcode_area: "OX4" },
  { slug: "st-albans", name: "St Albans", county: "Hertfordshire", postcode_area: "AL1" },
  { slug: "luton", name: "Luton", county: "Bedfordshire", postcode_area: "LU4" },
];

function band(hour) {
  if (hour < 8) return "early_morning";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

async function listAllUsers() {
  const res = await fetch(`${AUTHA}/users?per_page=200`, { headers: h });
  if (!res.ok) return [];
  const data = await res.json();
  return data.users ?? data ?? [];
}

async function ensureUser(email, existing) {
  const found = existing.find((u) => u.email === email);
  if (found) return found.id;
  const res = await fetch(`${AUTHA}/users`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      email,
      password: `Demo-${Math.random().toString(36).slice(2)}-9X!`,
      email_confirm: true,
    }),
  });
  if (!res.ok) throw new Error(`create user ${email} failed: ${res.status} ${await res.text()}`);
  return (await res.json()).id;
}

async function upsertProfiles(rows) {
  const res = await fetch(`${REST}/profiles?on_conflict=id`, {
    method: "POST",
    headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`profiles upsert failed: ${res.status} ${await res.text()}`);
}

async function upsertCentres() {
  const res = await fetch(`${REST}/test_centres?on_conflict=slug`, {
    method: "POST",
    headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(CENTRES),
  });
  if (!res.ok) throw new Error(`centres upsert failed: ${res.status} ${await res.text()}`);
}

async function clearTable(table) {
  // PostgREST requires a filter on DELETE; this matches every row.
  const res = await fetch(`${REST}/${table}?created_at=gte.1970-01-01`, { method: "DELETE", headers: h });
  if (!res.ok && res.status !== 404) throw new Error(`clear ${table} failed: ${res.status} ${await res.text()}`);
}

async function insertChunked(table, rows, size = 200) {
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const res = await fetch(`${REST}/${table}`, {
      method: "POST",
      headers: { ...h, Prefer: "return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`insert ${table} failed: ${res.status} ${await res.text()}`);
  }
}

function genReports(reporterIds) {
  const now = Date.now();
  const rows = [];
  CENTRES.forEach((c, idx) => {
    const profile = idx % 4; // 0 active, 1 recently, 2 dry, 3 quiet
    for (let d = 0; d < 14; d++) {
      const perDay = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < perDay; i++) {
        const when = new Date(now - d * 86_400_000);
        when.setHours(6 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60), 0, 0);
        const roll = Math.random();
        let type;
        if (profile === 2) type = roll < 0.92 ? "no_tests_found" : "queue_too_long";
        else if (profile === 0) type = roll < 0.5 ? "tests_available" : roll < 0.8 ? "no_tests_found" : "cancellation_seen";
        else if (profile === 1) type = roll < 0.3 ? "tests_available" : roll < 0.85 ? "no_tests_found" : "queue_too_long";
        else type = roll < 0.6 ? "no_tests_found" : roll < 0.8 ? "queue_too_long" : roll < 0.92 ? "govuk_error" : "tests_available";
        rows.push({
          user_id: reporterIds[(d * 3 + i) % reporterIds.length],
          centre_slug: c.slug,
          report_type: type,
          checked_at: when.toISOString(),
          time_band: band(when.getHours()),
          confidence: 50 + Math.floor(Math.random() * 40),
        });
      }
    }
    if (profile === 0) {
      for (let u = 0; u < 4; u++) {
        const when = new Date(now - (5 + u * 8) * 60_000);
        rows.push({
          user_id: reporterIds[u],
          centre_slug: c.slug,
          report_type: u % 2 === 0 ? "tests_available" : "cancellation_seen",
          checked_at: when.toISOString(),
          time_band: band(when.getHours()),
          confidence: 72,
        });
      }
    }
  });
  return rows;
}

async function main() {
  const existing = await listAllUsers();

  const demoId = await ensureUser("demo@testslotradar.app", existing);
  const instructorId = await ensureUser("instructor@testslotradar.app", existing);
  const adminId = await ensureUser("admin@testslotradar.app", existing);
  const reporterIds = [];
  for (let i = 1; i <= 10; i++) {
    reporterIds.push(await ensureUser(`reporter${i}@testslotradar.app`, existing));
  }

  await upsertProfiles([
    { id: demoId, display_name: "Demo Learner", role: "learner", is_instructor_verified: false },
    { id: instructorId, display_name: "Demo Instructor", role: "instructor", is_instructor_verified: true },
    { id: adminId, display_name: "Demo Admin", role: "admin", is_instructor_verified: false },
    ...reporterIds.map((id, i) => ({
      id,
      display_name: `Reporter ${i + 1}`,
      role: "learner",
      is_instructor_verified: false,
    })),
  ]);

  await upsertCentres();

  await clearTable("availability_reports");
  await insertChunked("availability_reports", genReports(reporterIds));

  await clearTable("user_centres");
  await insertChunked(
    "user_centres",
    ["high-wycombe", "aylesbury", "slough", "reading"].map((slug) => ({
      user_id: demoId,
      centre_slug: slug,
    })),
  );

  await clearTable("cancellation_posts");
  const now = Date.now();
  const inHours = (n) => new Date(now + n * 3_600_000).toISOString();
  await insertChunked("cancellation_posts", [
    {
      user_id: demoId,
      centre_slug: "high-wycombe",
      author_name: "Aisha (learner)",
      is_instructor: false,
      planned_cancel_at: inHours(3),
      test_month: "2026-07",
      note: "Cancelling my afternoon slot — others can check GOV.UK after 3pm.",
      status: "active",
      moderation_status: "approved",
      expires_at: inHours(4),
    },
    {
      user_id: instructorId,
      centre_slug: "aylesbury",
      author_name: "Mark — Pass First Time",
      is_instructor: true,
      planned_cancel_at: inHours(20),
      test_month: "2026-08",
      note: "One of my pupils is moving their test tomorrow morning.",
      status: "active",
      moderation_status: "approved",
      expires_at: inHours(21),
    },
  ]);

  console.log("Seed complete:");
  console.log(`  demo user:       ${demoId}`);
  console.log(`  instructor user: ${instructorId}`);
  console.log(`  admin user:      ${adminId}`);
  console.log(`  reporters:       ${reporterIds.length}`);
  console.log(`  centres:         ${CENTRES.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
