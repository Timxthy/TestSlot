# TestSlot Radar Quality Gates

A phase is not complete because the changed page looks correct. It is complete only when the required evidence below is recorded.

## 1. Baseline repository gate

Run from a clean Node 20 environment after `pnpm install --frozen-lockfile`:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm check:compliance
pnpm build
pnpm --filter web test:e2e
```

Where `pnpm check:launch` is expected to fail because external evidence is genuinely absent, record that as an expected gate rather than setting false evidence variables.

Before every commit:

```bash
git diff --check
git status --short
git diff --stat
```

Before every push:

```bash
git status --short --branch
pnpm typecheck
pnpm lint
pnpm test
pnpm check:compliance
pnpm build
```

Also run the phase-specific checks. Do not push with untracked migrations, failing tests or unexplained generated files.

## 2. Migration gate

Every migration must have evidence for:

- application from the immediately previous schema;
- application from zero in an isolated database before the pilot gate;
- repeat/idempotency behaviour where the migration claims to be idempotent;
- RLS state and grants after application;
- indexes for new production query paths;
- safe handling of existing rows;
- a rollback or forward-fix strategy;
- TypeScript and SQL rule parity where the same rule exists in both layers.

A migration may not be marked done solely because it parses.

## 3. Authentication gate

Against isolated staging:

1. create an account;
2. receive and follow the confirmation link;
3. establish a valid SSR session;
4. complete onboarding;
5. log out and log back in;
6. request a password reset;
7. follow a valid reset link and change password;
8. reject expired/invalid links safely;
9. update email/password from settings;
10. attempt destructive deletion without recent auth and confirm it is blocked;
11. complete step-up verification and delete/export correctly.

Verify that responses do not disclose whether an arbitrary email is registered.

## 4. RLS and authorization gate

Use separate learner, instructor, moderator and unauthenticated sessions. Verify:

- own-row access only where intended;
- public-read data excludes private/raw content;
- learners cannot access moderator APIs or data;
- restricted/banned users cannot submit or influence status;
- service-role-only tables/functions reject anon/authenticated calls;
- immutable audit records reject update/delete attempts;
- self-confirmation remains blocked;
- follow and submission caps hold under concurrent requests.

## 5. Notification gate

Demonstrate:

- one eligible event creates no more than one delivery per user/channel;
- rerunning a job does not duplicate a sent delivery;
- transient failures retry within the bound;
- permanent failures stop retrying and clean/quarantine the destination;
- an outage longer than the scheduler interval does not permanently miss eligible events;
- unsubscribe and preferences prevent dispatch;
- read state persists across two browser sessions/devices;
- invalid push endpoints are rejected;
- job failures produce an operator alert.

## 6. UX route-state gate

For each core route, capture desktop and mobile evidence for:

- initial/loading state;
- empty state;
- normal populated state;
- validation failure;
- recoverable server failure;
- permission/restriction state where applicable;
- success state;
- keyboard focus order.

Core routes:

- dashboard
- centre detail
- cancellation board
- report form
- notifications
- settings
- moderator queue

## 7. Accessibility gate

Required before closed pilot:

- automated accessibility scan on core routes;
- keyboard-only completion of signup, report, follow, reminder and moderation flows;
- visible focus and logical focus movement after dialogs/errors;
- form errors associated with fields and announced;
- status updates use appropriate live regions;
- colour is not the sole meaning carrier;
- reduced-motion behaviour is respected;
- one screen-reader smoke pass on the primary learner flow.

## 8. Security gate

- CSP and security headers verified in deployed responses;
- no service-role secret or server credential in browser bundles;
- all request schemas have explicit bounds;
- external URLs are allow-listed where the server makes requests;
- cron endpoints require strong authentication and reject replay/invalid calls as designed;
- error responses do not leak provider/database internals;
- dependency audit has no untriaged critical vulnerability;
- account deletion requires recent auth;
- monitoring deliberately captures a controlled server error without capturing secrets or report content.

## 9. Performance and load gate

Define and record budgets before testing. At minimum test:

- dashboard with the maximum pilot followed-centre count;
- centre feed with multiple pages of reports;
- moderator queue with representative flagged content;
- concurrent report submissions at and above rate limits;
- concurrent notification workers;
- scheduled reminder batch size;
- database query counts and slow queries for core routes.

Do not claim nationwide scale from a small pilot test. Record the tested load and limits honestly.

## 10. Release evidence template

Each release PR must state:

```md
## Scope

## Commit and branch

## Database migrations

## Automated checks

## Live staging checks

## Screenshots/manual checks

## Operational checks

## Known risks

## Rollback or forward-fix plan
```

The content must be normal engineering documentation. Do not include development-tool attribution or generated-by notices.
