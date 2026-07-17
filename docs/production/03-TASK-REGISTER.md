# TestSlot Radar Remaining Task Register

Statuses: `OPEN`, `IN PROGRESS`, `BLOCKED`, `EVIDENCE NEEDED`, `DONE`, `DEFERRED`.

## Phase 0 — Baseline recovery

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| P0-01 | P0 | Preserve current worktree and create a recoverable patch/bundle | Primary implementer | None | DONE | Durable recovery pack recorded outside the worktree |
| P0-02 | P0 | Rename local branch to `release/launch-hardening` before push | Primary implementer | P0-01 | DONE | Branch verified locally |
| P0-03 | P0 | Audit all modified/untracked files and remove accidental partial work | Primary implementer | P0-01 | DONE | Classification recorded in `docs/launch-readiness.md` |
| P0-04 | P0 | Review `0012_launch_hardening.sql` for idempotency, RLS, grants, triggers and compatibility | Primary implementer | P0-03 | DONE | Zero, upgrade, repeat and concurrency evidence recorded |
| P0-05 | P0 | Reconcile signup/profile-trigger change with email confirmation flow | Primary implementer | P0-04 | DONE | Route tests pass; manual-login callback dependency documented |
| P0-06 | P0 | Verify notification selection and realtime event changes | Primary implementer | P0-04 | DONE | Selection, provider-idempotency, SQL assertion and concurrency tests pass |
| P0-07 | P0 | Clean install from lockfile on Node 20 | Primary implementer | P0-03 | DONE | Node 20.20.2 / pnpm 9.15.0 frozen install recorded |
| P0-08 | P0 | Run complete repository gate | Primary implementer | P0-04–07 | DONE | Typecheck, lint, 108 unit tests, compliance, build and 13 E2E pass |
| P0-09 | P1 | Correct README/deployment docs that still describe an earlier product phase | Primary implementer | P0-03 | DONE | README, deployment and launch-readiness docs match the recovered baseline |
| P0-10 | P0 | Commit, push and open launch-hardening PR | Primary implementer | P0-08–09 | BLOCKED | Three local commits created; push/PR correctly withheld pending renewed GitHub CLI authentication |

## Phase 1 — Runtime and authentication

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| P1-01 | P0 | Define `mock`, `staging`, `production` mode contract | Primary implementer | Phase 0 | OPEN | Typed mode module and ADR/docs |
| P1-02 | P0 | Make middleware, data store, auth and realtime use the same mode | Primary implementer | P1-01 | OPEN | Mode matrix tests |
| P1-03 | P0 | Fail clearly on partial/invalid live configuration | Primary implementer | P1-01 | OPEN | Negative configuration tests |
| P1-04 | P0 | Add SSR/PKCE auth callback for email confirmation | Primary implementer | P1-02 | OPEN | Live staging signup/confirm test |
| P1-05 | P0 | Add forgot-password and reset-password flow | Primary implementer | P1-04 | OPEN | Expired/valid reset tests |
| P1-06 | P1 | Add email and password security settings | Primary implementer | P1-04 | OPEN | Settings and auth tests |
| P1-07 | P0 | Require recent auth for account deletion | Primary implementer | P1-05 | OPEN | Step-up/negative tests |
| P1-08 | P0 | Make login/signup abuse controls durable and enumeration-safe | Primary implementer | P1-02 | OPEN | Concurrency and response-shape tests |
| P1-09 | P0 | Add live staging auth lifecycle E2E | Primary implementer | P1-04–08 | OPEN | CI/manual evidence |

## Phase 2 — Trust and moderation

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| P2-01 | P0 | Enforce restricted/banned states on reports, cancellations and confirmations | Primary implementer | Phase 1 | OPEN | Route + DB trigger/policy tests |
| P2-02 | P0 | Add user flagging for availability reports | Primary implementer | P2-01 | OPEN | API/UI/moderator queue evidence |
| P2-03 | P1 | Add user flagging for cancellation posts | Primary implementer | P2-01 | OPEN | API/UI/moderator queue evidence |
| P2-04 | P0 | Build unified moderation queue with filters and reasons | Primary implementer | P2-02–03 | OPEN | Moderator E2E |
| P2-05 | P1 | Show user/content context and prior moderation history | Primary implementer | P2-04 | OPEN | Admin screenshots and tests |
| P2-06 | P0 | Reconcile modeled trust inputs with durable stored evidence | Primary implementer | P2-01 | OPEN | TypeScript/SQL parity tests |
| P2-07 | P1 | Add deterministic pagination to admin and activity feeds | Primary implementer | P2-04 | OPEN | Pagination tests |
| P2-08 | P0 | Verify RLS and concurrent rate/follow limits against staging | Primary implementer | P2-01–07 | OPEN | Policy and concurrency evidence |

## Phase 3 — Notification reliability

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| P3-01 | P0 | Persist in-app notifications | Primary implementer | Phase 2 | OPEN | Migration, store and E2E |
| P3-02 | P0 | Persist per-user read state across devices | Primary implementer | P3-01 | OPEN | Two-session test |
| P3-03 | P0 | Prove durable delivery selection after outage/restart | Primary implementer | P3-01 | OPEN | Outage recovery test |
| P3-04 | P0 | Bound retries and clean permanent push failures | Primary implementer | P3-03 | OPEN | Retry/device cleanup tests |
| P3-05 | P1 | Add email bounce/complaint handling where provider supports it | Primary implementer | P3-03 | OPEN | Signed webhook tests |
| P3-06 | P1 | Add manifest, notification assets and service-worker update handling | Primary implementer | P3-04 | OPEN | Browser smoke test |
| P3-07 | P0 | Add delivery metrics, run IDs and failure alerts | Primary implementer | P3-03–05 | OPEN | Controlled alert evidence |
| P3-08 | P0 | Verify unsubscribe and channel preferences at dispatch time | Primary implementer | P3-03 | OPEN | Dispatch tests |

## Phase 4 — Core product completion

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| P4-01 | P1 | Add pilot-centre search and filters | Product UX implementer | Phase 3 | OPEN | Desktop/mobile route evidence |
| P4-02 | P1 | Add coarse local centre ordering using postcode area | Product UX implementer | P4-01 | OPEN | Privacy-safe UX and tests |
| P4-03 | P0 | Complete loading, empty, error and success states on core routes | Product UX implementer | Phase 3 | OPEN | Route state matrix |
| P4-04 | P1 | Make settings coherent across profile, security, centres, reminders, channels and privacy | Product UX implementer | Phase 1–3 | OPEN | Settings journey E2E |
| P4-05 | P0 | Remove or neutralise dead-end premium CTAs for pilot | Product UX implementer | Phase 3 | OPEN | No unreachable upgrade action |
| P4-06 | P1 | Improve moderator queue usability without redesigning product | Product UX implementer | Phase 2 | OPEN | Moderator screenshots/tests |
| P4-07 | P0 | Preserve compliance wording and GOV.UK action hierarchy | Product UX implementer | All | OPEN | Compliance checks |
| P4-08 | P0 | Complete accessibility behaviour in changed routes | Product UX implementer | P4-01–07 | OPEN | Automated + keyboard evidence |

## Phase 5 — Production operations

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| P5-01 | P0 | Add and test CSP/security headers | Primary implementer | Phase 4 | OPEN | Header integration tests |
| P5-02 | P0 | Add server-route and scheduled-job error monitoring | Primary implementer | Phase 3 | OPEN | Controlled test error captured |
| P5-03 | P0 | Add health and readiness endpoints | Primary implementer | P5-02 | OPEN | Healthy/degraded tests |
| P5-04 | P0 | Alert on failed/stalled scheduled jobs | Primary implementer | P5-02 | OPEN | Controlled failure alert |
| P5-05 | P1 | Add explicit request and payload bounds | Primary implementer | Phase 4 | OPEN | Boundary tests |
| P5-06 | P1 | Run dependency/security review and record decisions | Primary implementer | P5-01 | OPEN | Audit report, no untriaged criticals |
| P5-07 | P0 | Create migration, incident and support runbooks | Primary implementer | P5-02–04 | OPEN | Reviewed docs |
| P5-08 | P0 | Document backup and perform restore rehearsal | Timothy + primary implementer | P5-07 | EVIDENCE NEEDED | Restore evidence and date |
| P5-09 | P1 | Update README and deployment docs to current architecture | Primary implementer | P5-01–08 | OPEN | Clean-checkout operator test |

## Phase 6 — Staging and pilot gate

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| P6-01 | P0 | Provision isolated staging Supabase/services configuration | Timothy | Phase 5 | EVIDENCE NEEDED | Project/config recorded securely |
| P6-02 | P0 | Apply all migrations from zero | Primary implementer | P6-01 | OPEN | Migration log and schema checks |
| P6-03 | P0 | Run database-backed auth/RLS/moderation/GDPR E2E | Primary implementer | P6-02 | OPEN | Passing live E2E report |
| P6-04 | P0 | Run notification/reminder scheduled-job smoke tests | Primary implementer | P6-02 | OPEN | Delivery records and no duplicates |
| P6-05 | P1 | Run accessibility audit on pilot routes | Primary implementer | P6-03 | OPEN | Automated/manual findings closed |
| P6-06 | P1 | Run performance and representative load checks | Primary implementer | P6-03–04 | OPEN | Results within recorded budgets |
| P6-07 | P0 | Configure 3–5 pilot centres and synthetic test fixtures | Timothy + primary implementer | P6-02 | OPEN | Pilot config reviewed |
| P6-08 | P0 | Instrument pilot success metrics | Primary implementer | P6-07 | OPEN | Event dictionary/dashboard evidence |
| P6-09 | P0 | Produce closed-pilot release evidence report | Primary implementer | P6-03–08 | OPEN | Signed release evidence document |

## External/legal gates

| ID | Priority | Task | Owner | Dependency | Status | Completion evidence |
|---|---|---|---|---|---|---|
| L-01 | P0 public beta | Privacy notice legal review | Timothy | Final data flows | EVIDENCE NEEDED | Reviewer/date/version |
| L-02 | P0 public beta | Terms legal review | Timothy | Final service behaviour | EVIDENCE NEEDED | Reviewer/date/version |
| L-03 | P0 public beta | DPIA sign-off | Timothy | Final data flows | EVIDENCE NEEDED | Signed DPIA |
| L-04 | P0 public beta | Processor agreement review | Timothy | Enabled providers fixed | EVIDENCE NEEDED | Decision register |
| L-05 | P1 public beta | Support contact and response process | Timothy | Phase 5 | OPEN | Published contact/runbook |

## Deferred until pilot proof

| ID | Task | Reason | Status |
|---|---|---|---|
| D-01 | Stripe/RevenueCat billing | Reliability and value not yet proven | DEFERRED |
| D-02 | Paid entitlement purchase journey | Depends on D-01 and pilot evidence | DEFERRED |
| D-03 | Native mobile app | Web pilot must validate behaviour first | DEFERRED |
| D-04 | Nationwide centre rollout | Risks an empty, stale network | DEFERRED |
| D-05 | Referral/gamification system | Could incentivise low-quality reports | DEFERRED |
