# SideQuest test strategy, requirements traceability, and release evidence

**November 13, 2026 | Working QA baseline.** Current implementation sources are [REQUIREMENTS](../REQUIREMENTS.md) and [SPECIFICATIONS](../SPECIFICATIONS.md). These test additions depend on the [Vitest V8 coverage PR #39](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/39), so the new QA branch is based on that PR; do not represent this as merged into master.

This is a practical, risk-based application of [ISTQB CTFL](https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/), [ISO/IEC/IEEE 29119](https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html), [OWASP ASVS](https://asvs.owasp.org/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), and [Playwright guidance](https://playwright.dev/docs/best-practices). Referencing them does **not** assert formal certification or comprehensive compliance.

## Implemented-requirement matrix

| Requirement / behavior | Primary implementation | Positive and boundary evidence | Negative, error and security evidence | Unresolved acceptance evidence |
| --- | --- | --- | --- | --- |
| R1: post valid event with stable ID, enforce required fields/length/time/campus date | `src/model/eventCatalog.ts`, `src/controller/postEvent.ts`, `server/api.ts`, `src/view/PostEventForm.tsx` | `tests/catalog.daven.event-catalog.test.ts`, `tests/catalog.date-cap.test.ts`, `tests/posting.daven.form.test.tsx`, `e2e/m1.spec.ts` | `tests/catalog.server.test.ts`, `tests/catalog.server.date-cap.daven.test.ts`, `tests/posting.daven.controller.test.ts`, `supabase/tests/event_date_posting_horizon.sql` | Real deployed POST with applied migration, invalid one-year-outside date and request failure recovery |
| R2: browse upcoming shared events and details by ID | `src/model/eventCatalog.ts`, `src/view/useEventCatalog.ts`, `src/view/DiscoverView.tsx` | `tests/browse-detail.integration.test.tsx`, `tests/master.catalog.test.ts`, `e2e/shared-catalog.spec.ts` | `tests/m2.resilience.test.tsx`, `e2e/shared-catalog.spec.ts` (server read error/retry, no false local fallback) | Authorized deployed Browser A -> independent Browser B shared event ID and refresh |
| R3: full-event-in-free-window matching, same date, inclusive boundaries | `src/model/events.ts`, `src/controller/findEvents.ts`, `src/controller/presentDiscover.ts` | `tests/model.fits.test.ts`, `tests/availability-boundaries.test.ts`, `tests/search.full-fit-sembiyan.test.ts`, `tests/interval.properties.test.ts`, `e2e/m1.spec.ts` | `tests/search-filter-and-sort.test.ts`, `tests/interval.properties.test.ts` (near misses, touching boundaries, generated intervals) | User verifies clear no-match/filter-reset states on phone |
| R4: add/remove device-local plan without deleting public event; persistence and conflicts | `src/model/schedule.ts`, `src/view/useSharedSchedule.ts`, `src/view/ScheduleTrailView.tsx` | `tests/schedule.model.test.ts`, `tests/schedule.integration.test.tsx`, `e2e/schedule.spec.ts`, `e2e/shared-catalog.spec.ts` | `tests/student-storage-errors.test.ts`, `tests/m2.resilience.test.tsx`, `e2e/schedule.spec.ts` (corruption, failures, duplicate ID, focus) | Two independent browsers confirm personal plans do not leak between devices |
| R5: resilient UI and secure limited API | `server/api.ts`, View controllers, `supabase/migrations/` | `tests/catalog.server.test.ts`, `tests/architecture.boundaries.test.ts`, `tests/interval.properties.test.ts`, `e2e/accessibility.spec.ts`, `e2e/cross-browser.spec.ts`, `e2e/visual-layout.spec.ts` | `tests/catalog.server.test.ts` (unknown URL, invalid body, forbidden verbs, origin policy, size, rate limit, no-store); `supabase/tests/event_catalog_permissions.sql` | Live project RLS/grants, current deployment, manual WCAG checks, representative student task sessions |

**Status rule:** File references mean tests exist; they do not guarantee those tests pass at a future commit. Use linked exact-commit CI and real test artifacts before moving evidence to VERIFIED.

## How to run the automated checks

From `app/`:

```sh
npm ci
npm test                    # Vitest unit, component, controller and API tests
npm run test:coverage       # V8: statements, branches, functions, lines
npm run test:mutation:pilot   # Four selected isolated event-fit mutations
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e             # Full Chromium plus tagged Firefox/WebKit smoke; local fixtures only
```

The additional Playwright checks use `@axe-core/playwright` to flag **serious/critical automated WCAG A/AA violations** in Discover, Post and Schedule. The cross-browser case checks a narrow-viewport navigation and invalid-post flow. The layout test verifies no horizontal overflow at 320, 390 and 1280 pixels and retains screen captures in `test-results/` as **review evidence**. These screenshots are *not yet golden pixel-diff snapshots*; stabilize fonts and the design before adding trustworthy comparisons.

The deterministic `interval.properties.test.ts` checks 500 generated event/free-window pairs against an independent time arithmetic oracle, 300 interval expansion examples, exact-edge cases and zero-overlap transitions. This adds test-data breadth without an external property-testing dependency. It is **not** a full fast-check shrinking suite or a Stryker mutation campaign. The separate `scripts/mutation-interval-pilot.mjs` compiles and runs four hand-selected altered `fitsFully` predicates in isolated Node VMs without modifying working-tree files; CI fails if a mutant survives its independent boundary corpus. This yields a **selected-mutant** result only, not a statistically meaningful mutation score for the full repository. If useful, later pilot Stryker on a dedicated isolated worktree and publish all surviving mutants.

## Manual live Supabase acceptance (REQUIRES authorized tester)

**Never paste keys, private connection details, bearer tokens or full user data into reports.** Use the team's existing authorized server configuration; do not run tests against the live project using the fixture runner, which posts test rows and deliberately mocks database responses.

1. Tester records *date, exact deployed SHA, browser versions, deployment URL (without credentials), environment kind and applied migration IDs*.
2. Verify server `GET /api/catalog` status and a real authorized read, then test anonymous SELECT and bounded INSERT against a controlled sample. Also verify denied anonymous UPDATE/DELETE, intentionally invalid posting payloads, and the one-year posting policy. Do not infer RLS from a local SQL fixture.
3. Browser A posts a uniquely named future test event. Record sanitized event ID and time. Browser B in an independent profile discovers that **same** ID and verifies full-fit search; reload both browsers.
4. Browser B adds the event, reloads and removes its local plan. Browser A's independent schedule remains empty; the public event remains readable. Confirm no silent local fallback on a forced server failure.
5. Perform documented clean-up via authorized database administration. Capture pass/fail, evidence links, exact tester/reviewer, observed response, error type, and any changes needed. **Daven's Nov 7 browser/shared-data report is TEAM REPORTED.** He subsequently [reported a concrete live RLS/grant test](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/33#issuecomment-6717127198): anon SELECT and seven-field INSERT allowed, UPDATE/DELETE rejected with 401 using the publishable key, and the row unchanged. Mark those live permission cases **TEAM REPORTED PASS**, while still requiring independently reviewed environment/migration details, repeatable evidence and exact cross-browser event-ID trace for release acceptance. This result predates the still-open [PR #38](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/38) posting-text-policy migration and cannot verify that new policy on live Supabase.

**Hard release blockers:** unauthorized reads/writes of private data if future auth ships, security keys in the browser bundle, unauthenticated mutation of public event rows, unhandled posting errors that lie about success, or core event/plan journeys failing. If pending, clearly label the app a prototype and do not claim production readiness.

## Accessibility, visual quality and students' tasks

Automated axe does not evaluate meaningful alt text, full keyboard order, screen-reader announcements, readability of message copy, cognitive load, or whether a visually attractive red form communicates an incorrect error state. Add manual keyboard-only checks across phone and desktop, a screen-reader pass, and task-based observations with actual SCU students.

Recommended unguided task script for reviewers:
- Open Discover, locate one named upcoming event, inspect details and close them with keyboard only; record focus return.
- Try an impossible date and a one-minute-too-short free-time window; show exact feedback without guessing.
- Create a valid 30-minute event, then intentionally omit one required field and observe error placement; verify that inputs are preserved.
- Add an event to My Schedule, reload, remove the plan and confirm the public event remains.
- In two independently signed-out browsers against an authorized shared deployment, check whether the same event appears and plans stay device-local.

Measure success (without hints), completion time, false-positive confirmations, number of retries, accessibility blockers and user confusion. Keep a screenshot or direct URL with every issue; do not call a feature complete because it looks good in one developer browser.

## Future SCU map acceptance (NOT IN CURRENT M2)

When a campus-only map is approved, verify student names/aliases, correct entrance, path network geometry, unreachable/crossing gates, closed segments, mobility constraints, shortest-path correctness, duration uncertainty, unknown/off-campus origins, source rights and access-control policy. A travel-inclusive feasibility verdict must remain distinct from existing event-only full fit. See [proposed SCU routing direction in documentation PR #40](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/40); follow its register after merge.

## Kandel course-testing and final-rubric extension (November 16)

[Instructor-based verification checklist](CSCI187_KANDEL_RUBRIC_EVIDENCE.md) now maps Lecture 18's **development, release, and real-user testing** to exact automated and manual evidence. The [manifest](kandel-rubric-evidence.json) tracks 20 runnable categories and 18 criteria requiring observation or team/instructor decisions, with file-existence and status-integrity checks. `npm run test:rubric` runs in CI and also protects additional mechanical clean-code rules from Lectures 07/13/16. The bounded local browser concurrency/outage test adds an informational latency attachment without a guessed deployment SLO.

The instructor materials do **not** expose a complete Gradescope point-by-point grading rubric; team members must verify any additional unpublished grading criteria in their authorized course view. Do not mark presentation, live production security, human usability or bonus eligibility as green based on CI alone.

## Next hardening work, by measured risk

1. Review highest-risk uncovered code branches in PR #39, especially `src/controller/postEvent.ts` and `server/api.ts`. Prefer meaningful assertions over a fixed 80% percentage gate.
2. Investigate all new axe findings and Firefox/WebKit failures; fix actual UI defects, not by blanket-disabling scanner rules or adding indiscriminate retries.
3. Complete and independently review the **real** Supabase acceptance record, then add safe authorization tests if a group/account model is ever approved.
4. Add stable pixel-diff visual snapshots after designs/fonts settle, and expand beyond the four-mutant pilot to targeted Stryker/fast-check campaigns with recorded surviving mutations and shrunk failures. Avoid running full mutation tests against the whole application in every CI job.
