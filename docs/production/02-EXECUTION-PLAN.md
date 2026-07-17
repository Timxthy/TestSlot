# TestSlot Radar Production Execution Plan

## 1. Delivery model

This programme uses the same usage-efficient principle as the VIPONSSI workflow, adapted for a data-backed product.

### Product control

- maintain the PRD, task register and phase boundaries;
- resolve product decisions and assess evidence;
- prepare bounded implementation prompts;
- review screenshots, flows and launch evidence;
- prevent unnecessary features from entering scope.

### Primary production implementation

The primary implementation role handles most mechanical and verifiable work:

- repository recovery and Git hygiene;
- typed runtime configuration;
- authentication and account flows;
- migrations, RLS and database constraints;
- route validation and error handling;
- trust/moderation wiring;
- notifications, scheduled jobs and provider handling;
- unit, integration, E2E and accessibility checks;
- security headers and observability;
- deployment and operations documentation;
- final hostile audit.

### Bounded product coherence implementation

A separate product-experience implementation pass is reserved until the foundations are stable:

- complete the core user journeys across existing routes;
- improve information hierarchy and interaction clarity;
- remove dead ends and inconsistent states;
- implement only the minimum frontend support needed for approved requirements.

This pass must not redesign the brand, rewrite backend architecture, add billing or expand scope. Escalate only a specific documented architecture or state-management blocker.

## 2. Phase sequence

### Phase 0 — Recover the unfinished launch-hardening branch

**Owner:** Primary implementer
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** rename current local branch to `release/launch-hardening`

Objectives:

- preserve and classify all current changes;
- validate migration `0012_launch_hardening.sql` against prior migrations and the target database;
- finish incomplete launch-hardening code;
- create a clean-install reproducible baseline;
- update inaccurate documentation;
- split the work into reviewable commits and merge it.

Suggested commits, only where the diff supports the separation:

1. `fix: enforce launch hardening safeguards`
2. `test: cover launch hardening rules`
3. `docs: record launch readiness requirements`

**Commit point:** after each cohesive slice passes its targeted tests.
**Push point:** once the complete Phase 0 gate passes. Push the renamed branch with upstream tracking, then open the PR.
**Do not push:** the existing tool-prefixed local branch name.

### Phase 1 — Runtime integrity and complete authentication

**Owner:** Primary implementer
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** `feat/runtime-auth-foundation`

Objectives:

- implement explicit `mock`, `staging` and `production` modes;
- eliminate the current half-live configuration risk;
- add validated environment contracts and tests;
- implement SSR-compatible email confirmation callback;
- add forgotten-password and reset-password flows;
- add security settings and step-up confirmation for destructive actions;
- add live staging auth E2E coverage.

Expected commit boundaries:

1. `fix: make application mode explicit`
2. `feat: complete account recovery and verification`
3. `test: cover live authentication lifecycle`

**Push point:** after all Phase 1 checks pass locally and the branch contains no unrelated UX changes. Open a PR immediately after the first full passing phase, not after every small commit.

### Phase 2 — Trust, moderation and database integrity

**Owner:** Primary implementer
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** `feat/trust-moderation-controls`

Objectives:

- enforce restricted/banned state consistently at route and database boundaries;
- add user flagging for availability reports and cancellation posts;
- provide a real moderation queue with reasons and history;
- reconcile modeled trust inputs with durable data sources;
- add pagination to moderation and activity queries;
- test RLS, limits and concurrency against staging.

Expected commit boundaries:

1. `fix: enforce account restrictions across submissions`
2. `feat: add report flagging and moderation workflows`
3. `test: verify trust and moderation boundaries`

**Push point:** after migration-from-zero, unit/integration tests and staging policy checks pass. Do not push a migration that has only been inspected but never applied to an isolated database.

### Phase 3 — Durable notifications and delivery operations

**Owner:** Primary implementer
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** `feat/notification-reliability`

Objectives:

- persist in-app notifications and read state;
- make read/unread state cross-device;
- harden idempotent selection and retries;
- manage invalid push endpoints and multiple devices;
- process email delivery failure signals where supported;
- add manifest/assets/service-worker lifecycle;
- expose delivery health and alerts.

Expected commit boundaries:

1. `feat: persist notification state`
2. `fix: harden delivery retries and device cleanup`
3. `feat: add notification delivery monitoring`

**Push point:** after delivery idempotency tests, retry tests, build and staged scheduled-job smoke tests pass.

### Phase 4 — Complete the core product experience

**Owner:** Product UX implementer
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** `feat/core-product-completion`

Routes in scope only:

- `/dashboard`
- `/centres/[slug]`
- `/cancellations`
- `/report`
- `/notifications`
- `/settings`
- `/admin`
- supporting shared navigation/components required by those routes

Objectives:

- add pilot-centre search/filtering and useful local ordering;
- unify empty/loading/error/success states;
- make settings complete and coherent;
- remove premium dead ends;
- improve moderation usability;
- preserve current brand and compliance language.

Maximum implementation budget:

- one branch;
- existing routes only;
- no new design system;
- no backend rewrite;
- no billing;
- no more than two coherent implementation commits plus one test/docs commit.

Suggested commits:

1. `feat: complete core centre and account journeys`
2. `refactor: unify app states and navigation`
3. `test: cover completed product flows`

**Push point:** only after route screenshots at desktop/mobile widths, targeted tests, full typecheck/lint/build and a self-review against the PRD. The product UX implementer must not push intermediate visual experiments.

### Phase 5 — Security, observability and operating controls

**Owner:** Primary implementer
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** `chore/production-operations`

Objectives:

- add CSP and required security headers;
- implement server and scheduled-job monitoring;
- add health/readiness endpoints;
- add job run IDs, failure alerts and bounded logs;
- update deployment, migration, incident and restore runbooks;
- add dependency and request-bound checks;
- verify backup/restore procedure.

Expected commit boundaries:

1. `security: add application security headers`
2. `feat: add production health and job monitoring`
3. `docs: add production operating runbooks`

**Push point:** after headers are tested, monitoring receives a controlled test error, a scheduled-job failure alert is demonstrated and the full repository gate passes.

### Phase 6 — Real staging verification and pilot readiness

**Owner:** Primary implementer
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** `test/staging-pilot-readiness`

Objectives:

- prove migrations from zero on an isolated staging project;
- run real account, RLS, moderation, notification and GDPR E2E flows;
- verify staging cannot seed or contact production;
- run accessibility, performance and representative load checks;
- add pilot KPI instrumentation and 3–5 centre configuration;
- produce a pilot release evidence report.

Suggested commits:

1. `test: add database-backed staging journeys`
2. `test: add pilot load and accessibility checks`
3. `docs: record closed pilot release evidence`

**Push point:** after all automated gates pass and the evidence document names any manual tests still requiring Timothy’s confirmation.

### Phase 7 — Independent release audit

**Owner:** Primary implementer in review-only mode first
**Local execution instruction:** Phase-specific operator prompt kept outside the repository
**Branch:** `audit/closed-pilot-release`

Objectives:

- independently inspect the merged product against this PRD;
- attempt to break auth, RLS, moderation, rate limits, delivery, GDPR and mode separation;
- check documentation and deployment reproducibility;
- classify findings by severity;
- fix only confirmed P0/P1 pilot blockers in the audit branch;
- record accepted P2/P3 work in the task register.

Commit only if fixes are required:

- `fix: resolve closed pilot release blockers`
- `docs: record closed pilot audit evidence`

**Push point:** after rerunning the entire release gate. No push is needed for an audit that produces only a local report unless the report is being committed as release evidence.

## 3. Merge policy

- All phases merge through pull requests to `main`.
- Do not work directly on `main`.
- Prefer squash merge for each phase so `main` remains readable.
- The squash title must be a normal human summary and must not reference development tools.
- Delete the remote phase branch after merge.
- Pull the merged `main` before starting the next phase.

## 4. Stop conditions

Stop a phase rather than broadening it when:

- a required production credential or external service configuration is unavailable;
- a migration cannot be safely proven against an isolated database;
- a requirement conflicts with product truth or DVSA constraints;
- the requested work belongs to billing, mobile or national expansion;
- the phase would modify routes or systems assigned to a later bounded pass.

Record the blocker and the smallest safe next action. Do not hide it with mock behaviour and call the phase complete.
