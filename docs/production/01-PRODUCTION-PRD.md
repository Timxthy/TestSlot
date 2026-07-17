# TestSlot Radar Remaining Production PRD

**Version:** 1.0
**Status:** Approved for implementation planning
**Owner:** Timothy Arole
**Primary release target:** closed pilot
**Public beta:** conditional on pilot evidence

## 1. Product definition

TestSlot Radar is a community-powered UK driving-test availability intelligence product. Learners and verified instructors report what they saw after checking GOV.UK themselves. The product aggregates those reports into centre-level signals, reminders and community notifications.

It must never present itself as an official DVSA service or imply that it scans, polls, scrapes, logs into or books against DVSA systems.

## 2. Production objective

Complete the existing web product to a standard where:

1. its runtime behaviour is deterministic across mock, staging and production;
2. a user can complete the account lifecycle safely;
3. community reports affect useful centre intelligence through controlled rules;
4. misleading or abusive content can be flagged, reviewed and contained;
5. reminders and notifications are durable, observable and recoverable;
6. operators can deploy, monitor, diagnose, restore and support the service;
7. a closed pilot can determine whether the community-data model is genuinely useful.

## 3. Product principles

### 3.1 Product truth

All public and in-product wording must make these facts clear:

- TestSlot Radar does not know live DVSA availability.
- A report is a community observation, not a guaranteed slot.
- A notification means “it may be worth checking GOV.UK”, not “a slot is available”.
- TestSlot Radar does not book tests or ask for DVSA credentials.

### 3.2 Concentration before expansion

The pilot must concentrate activity around 3–5 centres. Adding nationwide centre coverage before report freshness is proven is out of scope.

### 3.3 Reliability before monetisation

The data model may retain subscription tiers, but payment collection, billing portals and paid claims are deferred. Pilot screens must not send users into a non-existent upgrade flow.

### 3.4 Evidence before public launch

Passing local tests is not enough. Staging evidence, operational evidence, legal evidence and pilot metrics are required.

## 4. Users

### Learner

Needs to know which nearby centres and periods may be worth checking, contribute recent observations, follow centres and receive appropriate reminders.

### Verified instructor

Contributes higher-context observations, may support multiple learners and requires a clearly verified role rather than a self-declared badge.

### Moderator

Reviews flagged content and users, records reasons, applies reversible restrictions and sees an immutable audit trail.

### Operator

Deploys the product, applies migrations, monitors jobs, handles incidents, exports evidence and supports users.

## 5. Existing baseline

The existing repository already includes substantial implementations for:

- Next.js marketing and authenticated routes
- Supabase authentication and data access
- learner onboarding and centre follows
- availability reports and centre status computation
- cancellation posts
- trust scores and report confirmations
- moderator-only routes and immutable audit records
- scheduled reminders and web push
- notification delivery and retry records
- in-app notifications
- account export and deletion
- consented analytics and error boundaries
- realtime refresh
- unit, compliance and Playwright tests

The remaining programme must extend and harden this baseline rather than rebuild it.

## 6. Release definitions

### 6.1 Reproducible staging

Required before any pilot invite:

- clean checkout installation succeeds on Node 20 and pnpm 9;
- all migrations apply from zero to an isolated staging project;
- environment mode is explicit and invalid combinations fail clearly;
- signup, email confirmation, login, onboarding, logout and recovery work;
- CI and local gates pass;
- staging data is clearly synthetic and cannot enter production accidentally.

### 6.2 Closed pilot

Required before inviting controlled users:

- 3–5 pilot centres selected and seeded;
- reporting, following, moderation and notification loops work against staging/production-like services;
- user-facing empty, error and loading states are complete;
- moderation and delivery failures create actionable operational signals;
- pilot analytics measure contribution and usefulness without collecting unnecessary personal data;
- support and incident procedures exist.

### 6.3 Public beta

Required before open registration:

- legal and processor evidence gates recorded;
- accessibility and performance evidence recorded;
- production monitoring, alerting, backups and restore evidence recorded;
- abuse and moderation capacity is appropriate for expected volume;
- pilot thresholds in section 12 are met or an explicit risk decision is recorded.

## 7. Functional requirements

### FR-ENV — Runtime and configuration

- **FR-ENV-01:** Introduce one explicit application mode: `mock`, `staging` or `production`.
- **FR-ENV-02:** Middleware, server routes, server components and browser components must derive live/mock behaviour from the same mode contract.
- **FR-ENV-03:** Staging and production must require the correct public Supabase configuration. Privileged routes must separately validate server credentials.
- **FR-ENV-04:** Invalid or partial configurations must fail with a clear diagnostic rather than silently entering a half-live state.
- **FR-ENV-05:** Preview deployments must be intentionally mock or intentionally connected to a separate staging project.
- **FR-ENV-06:** Environment validation must have unit tests and a documented deployment matrix.

### FR-AUTH — Authentication and account lifecycle

- **FR-AUTH-01:** Email-confirmed signup must complete through a server-side auth callback compatible with Supabase SSR/PKCE.
- **FR-AUTH-02:** Confirmation failures, expired links and already-confirmed accounts require useful recovery states.
- **FR-AUTH-03:** Forgotten-password request and secure password reset must be implemented.
- **FR-AUTH-04:** Login and signup abuse controls must be durable across instances and must not reveal whether an email exists.
- **FR-AUTH-05:** Users must be able to update their password and email through settings with appropriate verification.
- **FR-AUTH-06:** Destructive account deletion must require recent authentication or an equivalent step-up confirmation.
- **FR-AUTH-07:** Auth redirects must reject external and protocol-relative destinations.
- **FR-AUTH-08:** Authentication flows require live staging E2E coverage, not only mock tests.

### FR-DATA — Centre discovery and reporting

- **FR-DATA-01:** Users must be able to search and filter available pilot centres.
- **FR-DATA-02:** Postcode-area data may be used for coarse local ordering, but must not imply precise location tracking.
- **FR-DATA-03:** Reports must have server and database validation, submission caps and durable decay rules.
- **FR-DATA-04:** Restricted or banned users must not influence centre status or create new reports/cancellations.
- **FR-DATA-05:** Large activity feeds require deterministic pagination.
- **FR-DATA-06:** The UI must expose report age, source type and confidence meaning without exposing raw trust scores.

### FR-TRUST — Trust, abuse and moderation

- **FR-TRUST-01:** Every user-generated content type must have a reporting/flagging path.
- **FR-TRUST-02:** Availability reports and cancellation posts must share a consistent moderation lifecycle.
- **FR-TRUST-03:** Moderators need queues, filters, content context, user context, previous actions and reason capture.
- **FR-TRUST-04:** Restriction, suspension and restoration actions must be enforced at the database boundary where practical.
- **FR-TRUST-05:** Audit records must be immutable and identify actor, target, action, reason and time.
- **FR-TRUST-06:** Automatic scam/abuse screening may hold content for review but must not be presented as infallible.
- **FR-TRUST-07:** Moderator access and role changes require explicit operator procedures.

### FR-NOTIFY — Notifications and reminders

- **FR-NOTIFY-01:** In-app notifications must be persisted with server-side read state so state follows the user across devices.
- **FR-NOTIFY-02:** Notification delivery must be idempotent, retryable and recoverable after a scheduler or provider outage.
- **FR-NOTIFY-03:** Delivery selection must not depend on a narrow lookback window that can permanently miss eligible events.
- **FR-NOTIFY-04:** Push subscriptions must support removal, expiry and multiple devices without uncontrolled duplication.
- **FR-NOTIFY-05:** Email unsubscribe and channel preferences must be respected at send time.
- **FR-NOTIFY-06:** Email provider bounces/complaints and permanent push failures must disable or quarantine invalid destinations.
- **FR-NOTIFY-07:** A web app manifest, valid notification assets and a service-worker update strategy are required.
- **FR-NOTIFY-08:** Operators need delivery metrics and alerts for failed or stalled jobs.

### FR-ACCOUNT — Profile, settings and privacy

- **FR-ACCOUNT-01:** Settings must provide profile, security, centre, reminder, notification and privacy controls in coherent sections.
- **FR-ACCOUNT-02:** Data export must either include each requested dataset or explicitly report a failed section; it must not silently return an incomplete successful export.
- **FR-ACCOUNT-03:** Account deletion must document retained anonymised aggregates and remove all directly identifying data covered by the product policy.
- **FR-ACCOUNT-04:** Consent choices must be withdrawable and must not block essential service operation.

### FR-UX — Product completion

- **FR-UX-01:** Core routes must have intentional loading, empty, validation, success and recoverable error states.
- **FR-UX-02:** There must be no dead-end premium CTA during the closed pilot. Locked features must be hidden or labelled as unavailable during the pilot.
- **FR-UX-03:** Navigation and terminology must be consistent across marketing, app and email surfaces.
- **FR-UX-04:** Forms must prevent duplicate submission and preserve useful input after recoverable errors.
- **FR-UX-05:** Moderator and operator interfaces may prioritise clarity over visual polish, but must be safe and usable.

### FR-OPS — Production operation

- **FR-OPS-01:** Add appropriate security headers, including a tested Content Security Policy.
- **FR-OPS-02:** Capture server-route, scheduled-job and database-operation failures in production monitoring without leaking secrets or user content.
- **FR-OPS-03:** Add health/readiness checks that distinguish application availability from dependency availability.
- **FR-OPS-04:** Scheduled jobs need failure alerts, run identifiers and idempotency evidence.
- **FR-OPS-05:** Production migrations must be forward-only, reviewed and documented with rollback/mitigation instructions.
- **FR-OPS-06:** Backups and at least one restore rehearsal must be documented.
- **FR-OPS-07:** An incident response and support runbook must exist before public beta.
- **FR-OPS-08:** README and deployment documentation must match the actual product.

## 8. Non-functional requirements

### Security

- Row-level security remains enabled on all user-data tables.
- Service-role access is isolated to server-only modules.
- No privileged key appears in browser output.
- Request bodies, URLs, notes and push payloads have explicit length bounds.
- Rate limits are durable and cannot rely only on one in-memory process.
- Destructive operations require reauthentication or step-up verification.

### Reliability

- Notification and reminder jobs are idempotent.
- Every asynchronous delivery has a durable state and bounded retries.
- A provider outage cannot permanently skip eligible messages.
- Database errors are mapped to stable user-safe responses.

### Accessibility

- Core pilot routes target WCAG 2.2 AA.
- Keyboard navigation, focus visibility, landmarks, labels, status messages and reduced-motion behaviour must be tested.
- Automated checks are required, but manual keyboard and screen-reader smoke evidence is also required.

### Performance

- Core pages must avoid unbounded queries and activity feeds.
- Database indexes must support production query shapes.
- A representative pilot load test must not produce uncontrolled duplicate deliveries or exhausted connection pools.
- Performance budgets must be defined for authenticated core routes.

### Privacy

- Collect only data required for account operation, coarse local centre relevance and product safety.
- Do not collect driving licence numbers, theory pass numbers, DVSA credentials or booking references.
- Analytics events must exclude report contents, email addresses and precise location.

### Maintainability

- Business rules have one source of truth or explicit parity tests where duplicated in SQL and TypeScript.
- Every migration and scheduled job is documented.
- New features include unit/integration coverage and update the task register.

## 9. Testing requirements

The production programme must include:

- unit tests for shared rules and environment validation;
- route/integration tests for validation, auth and error mapping;
- mock-mode Playwright for deterministic UI coverage;
- live staging Playwright for auth, RLS and database-backed journeys;
- migration-from-zero verification;
- accessibility checks on core routes;
- delivery idempotency and retry tests;
- representative load tests for reports, follows and delivery workers;
- release smoke tests against the deployed staging URL.

## 10. Operational evidence

Before public beta, record:

- deployment owner and date;
- migration version and database project;
- CI run and commit SHA;
- monitoring and alert test evidence;
- backup and restore rehearsal date;
- legal review/DPIA/processor decisions;
- accessibility review evidence;
- known risks and accepted mitigations.

## 11. Out of scope for this programme

- DVSA scanning, scraping, polling, login or booking automation
- native mobile applications
- full UK rollout before pilot validation
- automated instructor verification without an operator process
- paid billing, refunds and subscription support
- referral schemes or growth gamification
- complex machine-learning fraud scoring
- major visual rebrand

## 12. Pilot success metrics

The exact thresholds may be adjusted before invitations, but the pilot must measure:

- reports per active centre per day;
- percentage of centre signals based on reports less than 24 hours old;
- unique reporters per centre per week;
- repeat contribution rate;
- notification delivery success rate;
- notification open/click-through to the GOV.UK checking action;
- reports or posts flagged as inaccurate/abusive;
- moderator handling time;
- user-reported usefulness;
- seven-day retention among users who follow a centre.

Recommended minimum evidence before wider expansion:

- at least 3 active pilot centres;
- each active centre has recurring reports from more than one contributor;
- no unresolved critical moderation or notification defect;
- delivery success above 95% excluding invalid destinations;
- a meaningful proportion of notified users report that the signal helped them decide when to check.

These are product-validation gates, not marketing claims.

## 13. Product decisions fixed by this PRD

1. Complete web first; do not start mobile.
2. Closed pilot first; do not launch nationally.
3. Keep the tier model but remove dead-end upgrade behaviour during pilot.
4. Use an explicit runtime mode; do not infer application mode from a privileged credential.
5. Persist notifications and read state server-side.
6. Give availability reports a real flag/review workflow, not only cancellations.
7. One bounded core UX pass follows completion of the production foundations.
8. A separate independent review pass performs the final release audit.
