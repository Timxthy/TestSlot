# TestSlot Radar Git and GitHub Rules

## 1. Public history must read like normal engineering work

The following are prohibited in branch names, commit messages, PR titles, PR bodies, issue bodies, review comments, source comments and release notes:

- development-tool or model names
- automated/generated-by attribution
- robot emoji attribution
- `Co-Authored-By` trailers referring to a development tool
- commentary about prompts, tokens, usage or agent sessions

Describe the engineering work, reasoning, tests and risk—not the tool used to produce it.

Apply this rule to all new work. Do not rewrite old merged history unless Timothy explicitly chooses to do so.

## 2. Branch naming

Use product/work names only:

- `release/launch-hardening`
- `feat/runtime-auth-foundation`
- `feat/trust-moderation-controls`
- `feat/notification-reliability`
- `feat/core-product-completion`
- `chore/production-operations`
- `test/staging-pilot-readiness`
- `audit/closed-pilot-release`

Never include a model/tool name in a branch.

## 3. When to commit

Commit after an independently verifiable slice is complete. A valid commit should:

- have one clear purpose;
- include the tests needed for its behaviour where practical;
- leave the branch buildable;
- not depend on an uncommitted migration or hidden local file;
- not mix unrelated visual, backend, documentation and refactor work;
- pass targeted checks and `git diff --check`.

Do not commit:

- speculative partial work;
- known failing tests;
- debug logs or temporary fixtures;
- generated build output;
- unreviewed broad formatting changes;
- secrets or local environment files.

## 4. Commit message format

Use concise conventional messages:

```text
fix: make application mode explicit
feat: add report flagging workflow
test: cover notification outage recovery
security: add application security headers
docs: add production incident runbook
```

Commit body is optional. When useful, explain:

- why the change was needed;
- important behaviour or migration effects;
- verification performed;
- known limitations.

Do not mention how the code was generated.

## 5. When to push

Push at a phase checkpoint, not after every small edit.

A branch may be pushed when:

- it has at least one coherent passing commit;
- all phase-required local checks currently pass;
- the branch contains no secrets, caches or generated output;
- migrations included in the push have been tested against an isolated database;
- the branch name follows this document;
- the current diff contains no unrelated work.

For the current recovery branch, preserve the work locally first, rename it, complete the full Phase 0 gate, then perform the first push:

```bash
git push -u origin release/launch-hardening
```

Do not push the current tool-prefixed local branch name.

## 6. Pull request rules

Every phase goes through a PR into `main`.

PR title example:

```text
Complete launch hardening safeguards
```

PR body must contain:

- summary of behaviour changed;
- migration impact;
- tests and live checks;
- screenshots where UI changed;
- known risks;
- deployment/rollback notes.

PR body must not mention development tools or generation methods.

## 7. Merge rules

- CI must be green.
- Required manual/staging evidence must be attached or recorded.
- No unresolved P0/P1 review finding.
- Prefer squash merge for each phase.
- Use a human-written squash title.
- Delete the remote branch after merge.
- Update local `main` before starting the next phase.

## 8. Prompt requirement

Every execution instruction used for this production programme must contain a Git section. The implementer must report:

- branch name;
- commits created;
- checks run;
- whether the branch was pushed;
- PR URL if opened;
- any reason the push/PR was correctly withheld.
