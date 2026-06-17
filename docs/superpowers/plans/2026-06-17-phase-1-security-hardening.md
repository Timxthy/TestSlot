# Phase 1 Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the current partial Phase 1 web implementation back in line with the product plan's security, privacy, and compliance rails before expanding mobile, payments, or notification delivery.

**Architecture:** Keep the existing Next.js web app and shared package, but split data access into three explicit modes: user-session writes, trusted server-side aggregate reads, and moderator/admin mutations. Lock Supabase RLS so raw user content is not publicly readable, then make server-rendered product surfaces use a service-role read path only on the server. Shared Zod schemas become the first line of defence for centre slugs and cancellation dates.

**Tech Stack:** Next.js App Router, Supabase Auth/Postgres/RLS, TypeScript, Zod, Vitest, pnpm/Turbo.

---

## Current Repo Reality

The referenced PRD plan at `/Users/timxthy/.claude/plans/below-is-the-prd-ethereal-toucan.md` was written for an empty greenfield directory. The repo is no longer empty: it already contains Phase 0 marketing, auth, dashboard, reports, cancellation board, notifications, admin moderation, a shared package, and one Supabase migration.

Do not follow the greenfield plan literally. Execute this hardening plan first, then resume the full product roadmap.

There is no `.git` repository visible in `/Users/timxthy/Test Slot Radar` at review time. Commit steps are intentionally omitted until the workspace is initialized as a git repo.

## File Structure

- Create: `docs/superpowers/plans/2026-06-17-phase-1-security-hardening.md`
- Create: `apps/web/lib/env.ts`
- Modify: `apps/web/lib/supabase/admin.ts`
- Modify: `apps/web/lib/supabase/server.ts`
- Modify: `apps/web/lib/data/index.ts`
- Modify: `apps/web/lib/auth.ts`
- Modify: `apps/web/lib/notifications.ts`
- Modify: `apps/web/app/(app)/layout.tsx`
- Modify: `apps/web/components/app/AppNav.tsx`
- Modify: `apps/web/app/(app)/admin/page.tsx`
- Modify: `apps/web/app/api/admin/cancellations/route.ts`
- Modify: `apps/web/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/app/(app)/centres/[slug]/page.tsx`
- Modify: `apps/web/app/(app)/cancellations/page.tsx`
- Modify: `apps/web/app/(app)/notifications/page.tsx`
- Modify: `apps/web/app/api/notifications/route.ts`
- Modify: `apps/web/app/api/auth/signup/route.ts`
- Modify: `apps/web/app/api/onboarding/route.ts`
- Modify: `packages/shared/src/centres.ts`
- Modify: `packages/shared/src/reports.ts`
- Modify: `packages/shared/src/cancellations.ts`
- Modify: `packages/shared/src/reports.test.ts`
- Modify: `packages/shared/src/cancellations.test.ts`
- Create: `supabase/migrations/0002_security_hardening.sql`
- Modify: `package.json`
- Modify: `README.md`

## Task 1: Make Supabase Configuration Explicit And Lazy

**Files:**
- Create: `apps/web/lib/env.ts`
- Modify: `apps/web/lib/supabase/admin.ts`
- Modify: `apps/web/lib/supabase/server.ts`
- Modify: `apps/web/lib/data/index.ts`
- Modify: `apps/web/lib/auth.ts`

- [ ] **Step 1: Write the env helper**

Create `apps/web/lib/env.ts`:

```ts
export interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url && !anonKey && !serviceRoleKey) return null;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Supabase is partially configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, or unset all three for mock mode.",
    );
  }

  return { url, anonKey, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

export function requireSupabaseEnv(context: string): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(`${context} requires Supabase env vars. Unset all Supabase env vars for mock mode.`);
  }
  return env;
}
```

- [ ] **Step 2: Make the admin client lazy**

Change `apps/web/lib/supabase/admin.ts` to export a function, not an eagerly constructed client:

```ts
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/env";

/**
 * Service-role client (bypasses RLS). Server-only.
 * Never import this into client components.
 */
export function createSupabaseAdminClient() {
  const env = requireSupabaseEnv("createSupabaseAdminClient");
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

- [ ] **Step 3: Make the server session client validate env only when used**

Change `apps/web/lib/supabase/server.ts` to read env inside the function:

```ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { requireSupabaseEnv } from "@/lib/env";

export function createSupabaseServerClient() {
  const env = requireSupabaseEnv("createSupabaseServerClient");
  const cookieStore = cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // setAll called from a Server Component; middleware refreshes cookies.
        }
      },
    },
  });
}
```

- [ ] **Step 4: Split stores by purpose**

Change `apps/web/lib/data/index.ts` to use the lazy admin client and add a server-side read store:

```ts
import type { DataStore } from "./store";
import { mockStore } from "./mock-store";
import { createSupabaseStore } from "./supabase-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export function getStore(): DataStore {
  if (!isSupabaseConfigured()) return mockStore;
  return createSupabaseStore(createSupabaseServerClient());
}

export function getSystemStore(): DataStore {
  if (!isSupabaseConfigured()) return mockStore;
  return createSupabaseStore(createSupabaseAdminClient());
}

export function getAdminStore(): DataStore {
  return getSystemStore();
}

export type { DataStore } from "./store";
```

- [ ] **Step 5: Align auth mode detection**

In `apps/web/lib/auth.ts`, replace the local `useSupabase` constant with `isSupabaseConfigured()`:

```ts
import { isSupabaseConfigured } from "@/lib/env";

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return DEMO_USER;
  // existing Supabase auth lookup stays here
}
```

- [ ] **Step 6: Verify no-Supabase mock mode still builds**

Run:

```bash
pnpm typecheck
pnpm build
```

Expected: both pass with no `supabaseUrl is required` error.

## Task 2: Tighten Shared Input Validation

**Files:**
- Modify: `packages/shared/src/centres.ts`
- Modify: `packages/shared/src/reports.ts`
- Modify: `packages/shared/src/cancellations.ts`
- Modify: `packages/shared/src/reports.test.ts`
- Modify: `packages/shared/src/cancellations.test.ts`

- [ ] **Step 1: Add centre slug helper**

Append to `packages/shared/src/centres.ts`:

```ts
export function isKnownCentreSlug(slug: string): boolean {
  return TEST_CENTRES.some((c) => c.slug === slug);
}
```

- [ ] **Step 2: Reject unknown report centre slugs**

In `packages/shared/src/reports.ts`, import `isKnownCentreSlug` and refine `centreSlug`:

```ts
import { isKnownCentreSlug } from "./centres";

export const reportInputSchema = z.object({
  centreSlug: z
    .string()
    .min(1, "Choose a centre.")
    .refine(isKnownCentreSlug, "Choose a valid centre."),
  type: z.enum(REPORT_TYPES, { required_error: "Tell us what you saw." }),
  earliestMonth: z.string().regex(/^\d{4}-\d{2}$/, "Use the month picker.").optional(),
  timeBand: z.enum(TIME_BANDS).optional(),
  note: z.string().max(280, "Keep notes under 280 characters.").optional(),
});
```

- [ ] **Step 3: Reject malformed or past cancellation datetimes**

In `packages/shared/src/cancellations.ts`, import `isKnownCentreSlug` and add a reusable date guard:

```ts
import { z } from "zod";
import { isKnownCentreSlug } from "./centres";

function parseFutureDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() <= Date.now()) return null;
  return date;
}

export const cancellationInputSchema = z.object({
  centreSlug: z
    .string()
    .min(1, "Choose a centre.")
    .refine(isKnownCentreSlug, "Choose a valid centre."),
  plannedCancelAt: z.string().superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "When do you plan to cancel?" });
      return;
    }
    if (!parseFutureDate(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a valid future time." });
    }
  }),
  testMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  note: z.string().max(280, "Keep notes under 280 characters.").optional(),
  noPayment: z.literal(true, {
    errorMap: () => ({ message: "You must agree not to ask for payment." }),
  }),
  noPersonalDetails: z.literal(true, {
    errorMap: () => ({ message: "You must agree not to ask for personal details." }),
  }),
  understandsSelfBooking: z.literal(true, {
    errorMap: () => ({ message: "You must confirm others book on GOV.UK themselves." }),
  }),
});
```

- [ ] **Step 4: Add report validation tests**

Add to `packages/shared/src/reports.test.ts`:

```ts
it("rejects an unknown centre slug", () => {
  expect(
    reportInputSchema.safeParse({
      centreSlug: "not-a-centre",
      type: "tests_available",
    }).success,
  ).toBe(false);
});
```

- [ ] **Step 5: Add cancellation validation tests**

Change the `base` date in `packages/shared/src/cancellations.test.ts` to a far-future value and add tests:

```ts
const base = { centreSlug: "reading", plannedCancelAt: "2099-06-20T15:30" };

it("rejects an unknown centre slug", () => {
  expect(
    cancellationInputSchema.safeParse({
      ...base,
      centreSlug: "not-a-centre",
      noPayment: true,
      noPersonalDetails: true,
      understandsSelfBooking: true,
    }).success,
  ).toBe(false);
});

it("rejects an invalid planned cancellation time", () => {
  expect(
    cancellationInputSchema.safeParse({
      ...base,
      plannedCancelAt: "not-a-date",
      noPayment: true,
      noPersonalDetails: true,
      understandsSelfBooking: true,
    }).success,
  ).toBe(false);
});

it("rejects a past planned cancellation time", () => {
  expect(
    cancellationInputSchema.safeParse({
      ...base,
      plannedCancelAt: "2020-01-01T10:00",
      noPayment: true,
      noPersonalDetails: true,
      understandsSelfBooking: true,
    }).success,
  ).toBe(false);
});
```

- [ ] **Step 6: Verify shared tests**

Run:

```bash
pnpm --filter @testslot/shared test
```

Expected: all shared tests pass.

## Task 3: Lock Down Raw Report And Profile RLS

**Files:**
- Create: `supabase/migrations/0002_security_hardening.sql`
- Modify: `apps/web/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/app/(app)/centres/[slug]/page.tsx`
- Modify: `apps/web/app/(app)/cancellations/page.tsx`
- Modify: `apps/web/app/(app)/notifications/page.tsx`
- Modify: `apps/web/app/api/notifications/route.ts`
- Modify: `apps/web/lib/notifications.ts`

- [ ] **Step 1: Add the hardening migration**

Create `supabase/migrations/0002_security_hardening.sql`:

```sql
-- Remove self-service writes to privileged profile fields.
drop policy if exists profiles_own_update on profiles;

-- Users may read their own profile. Profile writes go through allowlisted
-- server routes using the service-role client.
drop policy if exists profiles_own_read on profiles;
create policy profiles_own_read on profiles for select
  using (auth.uid() = id);

-- Raw reports are not public data. Product surfaces must use server-side
-- aggregate/read models, not direct public Supabase reads.
drop policy if exists reports_read on availability_reports;
drop policy if exists reports_own_read on availability_reports;
create policy reports_own_read on availability_reports for select
  using (auth.uid() = user_id);

-- Keep inserts scoped to the authenticated user.
drop policy if exists reports_insert_own on availability_reports;
create policy reports_insert_own on availability_reports for insert
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Use server aggregate reads on dashboard**

In `apps/web/app/(app)/dashboard/page.tsx`, import `getSystemStore` and use it for status reads:

```ts
import { getStore, getSystemStore } from "@/lib/data";

const userStore = getStore();
const readStore = getSystemStore();
const [follows, statuses] = await Promise.all([
  userStore.listFollows(user.id),
  readStore.listCentreStatuses(),
]);
```

- [ ] **Step 3: Use server aggregate reads on centre page**

In `apps/web/app/(app)/centres/[slug]/page.tsx`, keep follows on `getStore()` and centre data on `getSystemStore()`:

```ts
import { getStore, getSystemStore } from "@/lib/data";

const userStore = getStore();
const readStore = getSystemStore();
const centre = await readStore.getCentre(params.slug);

const [status, heatmap, reports, follows] = await Promise.all([
  readStore.getCentreStatus(centre.slug),
  readStore.getHeatmap(centre.slug),
  readStore.listReports(centre.slug, 12),
  userStore.listFollows(user.id),
]);
```

- [ ] **Step 4: Use server aggregate reads on cancellation board**

In `apps/web/app/(app)/cancellations/page.tsx`:

```ts
import { getSystemStore } from "@/lib/data";

const store = getSystemStore();
const posts = await store.listCancellations();
```

- [ ] **Step 5: Split notification stores**

Change `apps/web/lib/notifications.ts` signature:

```ts
export async function getUserNotifications(
  stores: { userStore: DataStore; readStore: DataStore },
  userId: string,
): Promise<AppNotification[]> {
  const { userStore, readStore } = stores;
  const follows = await userStore.listFollows(userId);
  if (follows.length === 0) return [];

  const statuses = await readStore.listCentreStatuses();
  // Replace later store.listReports/listCancellations calls with readStore.
}
```

Update every `store.listReports(...)` and `store.listCancellations(...)` call in that file to `readStore.listReports(...)` and `readStore.listCancellations(...)`.

- [ ] **Step 6: Update notification page and API**

In `apps/web/app/(app)/notifications/page.tsx`:

```ts
import { getStore, getSystemStore } from "@/lib/data";

const items = await getUserNotifications(
  { userStore: getStore(), readStore: getSystemStore() },
  user.id,
);
```

In `apps/web/app/api/notifications/route.ts`:

```ts
import { getStore, getSystemStore } from "@/lib/data";

const notifications = await getUserNotifications(
  { userStore: getStore(), readStore: getSystemStore() },
  user.id,
);
```

- [ ] **Step 7: Verify type safety**

Run:

```bash
pnpm typecheck
```

Expected: typecheck passes.

## Task 4: Add Moderator Authorization To Admin Surfaces

**Files:**
- Modify: `apps/web/lib/auth.ts`
- Modify: `apps/web/app/(app)/layout.tsx`
- Modify: `apps/web/components/app/AppNav.tsx`
- Modify: `apps/web/app/(app)/admin/page.tsx`
- Modify: `apps/web/app/api/admin/cancellations/route.ts`

- [ ] **Step 1: Add role helpers**

In `apps/web/lib/auth.ts`, include `super_admin` and role helpers:

```ts
export type SessionRole = "learner" | "instructor" | "moderator" | "admin" | "super_admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
  isInstructor: boolean;
}

export function canModerate(role: SessionRole): boolean {
  return role === "moderator" || role === "admin" || role === "super_admin";
}

export async function requireModerator(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canModerate(user.role)) redirect("/dashboard");
  return user;
}
```

- [ ] **Step 2: Hide the Admin nav link for non-moderators**

Change `apps/web/components/app/AppNav.tsx`:

```ts
import type { SessionRole } from "@/lib/auth";
import { canModerate } from "@/lib/auth";

export function AppNav({ role }: { role: SessionRole }) {
  const pathname = usePathname();
  const visibleLinks = links.filter((link) => link.href !== "/admin" || canModerate(role));
  // map visibleLinks instead of links
}
```

Change both `AppNav` calls in `apps/web/app/(app)/layout.tsx`:

```tsx
<AppNav role={user.role} />
```

- [ ] **Step 3: Guard the admin page before creating the admin store**

In `apps/web/app/(app)/admin/page.tsx`:

```ts
import { requireModerator } from "@/lib/auth";

export default async function AdminPage() {
  await requireModerator();
  const store = getAdminStore();
  const pending = await store.listPendingCancellations();
  // existing JSX
}
```

- [ ] **Step 4: Guard the admin moderation API before creating the admin store**

In `apps/web/app/api/admin/cancellations/route.ts`:

```ts
import { requireModerator } from "@/lib/auth";

export async function POST(request: Request) {
  await requireModerator();
  // parse body, validate id/action, then call getAdminStore()
}
```

If `redirect()` is not appropriate inside this route handler, use `getCurrentUser()` and return JSON:

```ts
const user = await getCurrentUser();
if (!user || !canModerate(user.role)) {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}
```

- [ ] **Step 5: Verify admin route is not open**

Run:

```bash
pnpm typecheck
pnpm build
```

Expected: both pass. Manual check after starting the app: learner sessions do not see `/admin` in nav and receive a redirect or 403 for admin moderation actions.

## Task 5: Check All Trusted Mutation Results

**Files:**
- Modify: `apps/web/app/api/auth/signup/route.ts`
- Modify: `apps/web/app/api/onboarding/route.ts`

- [ ] **Step 1: Fail signup if profile creation fails**

In `apps/web/app/api/auth/signup/route.ts`, use the lazy admin client and check the profile write:

```ts
const supabaseAdmin = createSupabaseAdminClient();

const { error: profileError } = await supabaseAdmin
  .from("profiles")
  .upsert({
    id: created.user.id,
    display_name: name,
    role: "learner",
    is_instructor_verified: false,
  });

if (profileError) {
  await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
  return NextResponse.json({ error: "Could not create your profile." }, { status: 500 });
}
```

- [ ] **Step 2: Fail onboarding if the profile update fails**

In `apps/web/app/api/onboarding/route.ts`, use the lazy admin client and check mutation errors:

```ts
const supabaseAdmin = createSupabaseAdminClient();

const { error: profileError } = await supabaseAdmin
  .from("profiles")
  .update({ postcode_area: parsed.data.postcodeArea })
  .eq("id", user.id);

if (profileError) {
  return NextResponse.json({ error: "Could not save your postcode area." }, { status: 500 });
}
```

- [ ] **Step 3: Validate onboarding centre slugs before service-role upsert**

In `apps/web/app/api/onboarding/route.ts`, import `isKnownCentreSlug` and reject invalid slugs:

```ts
import { isKnownCentreSlug } from "@testslot/shared";

const centres = parsed.data.centres ?? [];
if (centres.some((slug) => !isKnownCentreSlug(slug))) {
  return NextResponse.json({ error: "Choose valid centres." }, { status: 422 });
}
```

- [ ] **Step 4: Fail onboarding if follow upsert fails**

After the `user_centres` upsert:

```ts
const { error: followsError } = await supabaseAdmin
  .from("user_centres")
  .upsert(
    centres.map((slug) => ({ user_id: user.id, centre_slug: slug })),
    { onConflict: "user_id,centre_slug", ignoreDuplicates: true },
  );

if (followsError) {
  return NextResponse.json({ error: "Could not save your centres." }, { status: 500 });
}
```

- [ ] **Step 5: Verify route compilation**

Run:

```bash
pnpm typecheck
pnpm build
```

Expected: both pass.

## Task 6: Update Runtime And Documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Raise Node engine**

Change `package.json`:

```json
"engines": {
  "node": ">=20.0.0"
}
```

- [ ] **Step 2: Document the two supported local modes**

Update the README waitlist/local setup section to say:

```md
Local development supports two modes:

- Mock mode: leave all Supabase env vars unset. The app uses the seeded in-memory mock store, and waitlist entries write to `apps/web/.data/waitlist.json`.
- Supabase mode: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Partial Supabase configuration fails fast so the app does not silently mix mock auth with production data.
```

- [ ] **Step 3: Verify all checks**

Run the full verification set:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check:compliance
pnpm build
```

Expected:

- Shared tests pass.
- Typecheck passes.
- Lint passes.
- Compliance phrase scan passes.
- Build passes under Node 20+ without Supabase SDK Node 18 warnings.

## Stop Conditions

Do not start mobile, payments, public SEO status pages, or richer notification dispatch until these are complete:

- Admin moderation requires moderator/admin/super_admin.
- Users cannot self-update privileged profile fields through RLS.
- Raw reports are not publicly readable through Supabase.
- Mock mode and Supabase mode are mutually explicit.
- Cancellation/report inputs reject unknown centre slugs.
- Cancellation inputs reject invalid and past times.
- Signup/onboarding trusted writes fail loudly instead of returning success after partial writes.

## Follow-Up After This Plan

After this hardening plan passes verification, the next implementation plan should cover the PRD's durable Phase 1 backend shape:

- `centre_status` derived table
- `centre_heatmap` aggregate table or materialized view
- status recomputation job
- notification persistence table
- audit logs and moderation actions
- rate limiting for reports, cancellations, auth, and abuse actions
