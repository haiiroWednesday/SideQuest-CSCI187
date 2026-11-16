# SideQuest regression coverage matrix

**November 16, 2026.** This is a living, risk-based regression register for **the implemented M2 application**. Run the entire automated suite after changes to the shared catalog, Model/Controller/View contracts, API, SQL policies, styles, or persistence. No finite automated suite can prove the absence of every defect.

## Run a full application regression

From `app/`:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run test:regression
```

`test:regression` executes all Vitest tests with V8 coverage, the isolated four-mutant event-fit pilot, rubric/clean-code guard tests, a production build and the complete Playwright browser suite. The browser test harness **requires its own free ports** 5173/5175/5176/5177 and uses fixture-only local Node/API/PostgREST services. CI additionally applies/testing database migrations and permission policies against isolated PostgreSQL. This command does not contact or test the team's live Supabase deployment.

### Risk/requirement → executable cases

| ID and risk | Checks / expected observable outcome | Primary executable evidence |
| --- | --- | --- |
| REG-POST-01 required fields | Missing/whitespace text fails at Model and UI without creating a row | `app/tests/regression.contract-matrix.test.ts`, `app/e2e/regression.journeys.spec.ts` |
| REG-POST-02 maximum limits | Exactly allowed title, host, description and location lengths pass; +1 fails | `regression.contract-matrix.test.ts`, `catalog.daven.event-catalog.test.ts` |
| REG-POST-03 valid dates | Reject nonexistent dates, noncanonical formats and past event dates | `regression.contract-matrix.test.ts`, `catalog.date-cap.test.ts` |
| REG-POST-04 time validity | Reject equal/reversed/overnight and malformed times; allow current-minute starts | `regression.contract-matrix.test.ts`, `catalog.date-cap.test.ts`, `catalog.server.test.ts` |
| REG-POST-05 one-year horizon | Inclusive campus date boundary, Feb 29 clamping and SQL policy | `catalog.date-cap.test.ts`, `supabase/tests/event_date_posting_horizon.sql` |
| REG-POST-06 copy/persistence safety | Trimming happens only on valid creation; invalid post never changes stored rows; retry retains draft | `regression.contract-matrix.test.ts`, `regression.journeys.spec.ts`, `shared-catalog.spec.ts` |
| REG-POST-07 server authorization | Rate limiting, errors, request shapes, no CORS bypass or unauthorized mutation, server-held keys | `catalog.server.test.ts`, `event_catalog_permissions.sql`, `shared-catalog.spec.ts` |
| REG-DISCOVER-01 chronological list | Date/time and deterministic ID ordering, duplicate titles retain separate IDs | `regression.contract-matrix.test.ts`, `present.screens.test.ts` |
| REG-DISCOVER-02 event time window | Inclusive start/end, non-fitting one-minute misses, other dates, invalid/partial free window | `regression.contract-matrix.test.ts`, `regression.journeys.spec.ts` |
| REG-DISCOVER-03 status and errors | Empty, zero results, loading and failures are distinct; errors never fabricate local fallback | `regression.contract-matrix.test.ts`, `shared-catalog.spec.ts` |
| REG-DISCOVER-04 details and freshness | Verified ID, stale lookup responses cannot replace another event, focus returns on mobile | `browse-detail.ui-regressions.test.tsx`, `schedule.spec.ts`, `discover-long-text.spec.ts` |
| REG-TIME-01 campus time | Los Angeles wall-clock rules regardless of device timezone, date/year boundary and live expiry | `calendar.dates.test.ts`, `present.screens.test.ts`, `schedule.spec.ts` |
| REG-SCHEDULE-01 identity and capacity | Device-only ID storage, duplicate additions idempotent, 100-plan cap, safe removal | `regression.contract-matrix.test.ts`, `schedule.model.test.ts` |
| REG-SCHEDULE-02 history and conflicts | Past records retained, adjacent slots nonconflicting, nested overlaps detected | `regression.contract-matrix.test.ts`, `schedule.spec.ts` |
| REG-SCHEDULE-03 corrupt storage | Broken localStorage remains untouched until explicit confirmed recovery | `regression.contract-matrix.test.ts`, `schedule.spec.ts`, `student-storage-errors.test.ts` |
| REG-SCHEDULE-04 no public deletion | Filtering and removing a personal plan never deletes its public event row | `regression.journeys.spec.ts`, `m1.spec.ts`, `shared-catalog.spec.ts` |
| REG-SHARED-01 real inter-session fixture | Two independent profiles see shared posts but maintain separate local plans | `shared-catalog.spec.ts` |
| REG-LOCAL-01 no false sharing | Local-only posts stay in the original browser, clearly labeled as such | `regression.journeys.spec.ts` |
| REG-RESILIENCE-01 transient service outage | Browse/Schedule/Posting errors, retry and local Node read-outage recovery | `shared-catalog.spec.ts`, `release-dependability.spec.ts` |
| REG-A11Y-01 semantics and keyboard | Core-screen axe WCAG scan, phone modal focus/escape, form controls | `accessibility.spec.ts`, `schedule.spec.ts` |
| REG-VISUAL-01 screen widths | No page horizontal overflow, functional layout at 320px/390px/1280px; stored screenshot evidence | `visual-layout.spec.ts`, `discover-long-text.spec.ts` |
| REG-BROWSER-01 engines | Chromium full suite; tagged high-value Firefox/WebKit smoke | `cross-browser.spec.ts`, `playwright.config.ts` |
| REG-CODE-01 architectural hygiene | MVC import boundaries, source style and no suppressed errors/debug statements | `architecture.boundaries.test.ts`, `source-consistency.test.ts`, `kandel.code-quality.test.ts` |
| REG-EVIDENCE-01 test integrity | Manifest paths, source proof, pending human criteria remain pending | `kandel.rubric-evidence.test.ts` |

The `app/tests/regression.contract-matrix.test.ts` file groups the new table-driven contract cases under `REG-POST`, `REG-DISCOVER`, and `REG-SCHEDULE`. The `app/e2e/regression.journeys.spec.ts` file provides five end-to-end `REG-UI` scenarios. These operate within the same shared Model/Controller/View rules as the existing tests.

## Kandel Lecture 18, page 17: regression red/green evidence

A test that passes against current code demonstrates **expected behavior**, but does not by itself demonstrate that it would have caught the original bug. When a new defect is reported, follow the instructor's five-step process:

1. Preserve the *actual* triggering input, initial state, environment and incorrect observed output; specify the correct output independently.
2. Add a deterministic failing unit, component or black-box test that reproduces that defect.
3. **Verify red:** run it against the affected commit (or an isolated, equivalent defective implementation), recording the failing test name, SHA and logs. A failing test due to a broken fixture, timeout or type error is not valid defect detection.
4. Fix the root cause without weakening or skipping the test. Keep production code, fixture and test edits separately reviewable.
5. **Verify green:** show the same test passing on the fixed SHA, then run the full regression and integration suites. Record the PR, both CI results and any change in expected behavior.

| Record for a newly discovered bug | Required evidence |
| --- | --- |
| Bug/issue and affected feature | Issue URL, impact and reproducible preconditions |
| Trigger and expected outcome | Specific user actions/input, seeded catalog/plan IDs, clock/timezone and expected externally visible result |
| Red confirmation | Broken commit SHA or isolated mutation; failing assertion showing the **defect**, not a setup error |
| Fix and green confirmation | Fixed commit SHA, passing focused test and full CI run |
| Regression case | Stable test file/case name and associated requirement ID |

The existing `npm run test:mutation:pilot` is a **bounded example of red/green sensitivity**: it compares the correct event-fit result against four deliberately faulty variants (exclusive boundaries, zero-duration acceptance and missing date check), then fails CI if any mutant is undetected. Its reported **4/4** result proves sensitivity only to these four seeded defects. Do not describe this as codebase-wide mutation testing or historical proof that every M1/M2 bug was reproduced before being fixed.

The `REG-*` cases in this matrix include **preventive contract tests** as well as true bug regressions. Label new cases according to actual provenance; never invent a historical failure log or reopen already-resolved instructor comments. The lecture also separates programmer testing, whole-system release testing and **observed human usability testing** (pages 14–15, 19–26). All three are needed for a credible release review, but a green automation run cannot substitute for the latter.

## Regression execution and escalation

1. **Every PR:** Run the complete CI suite on the exact integrated commit, not on older independent PR heads. Fix flaky assertions at their cause; do not blanket-disable tests.
2. **Changing SQL or backend policies:** Re-run the SQL policy suite in CI and an approved, sanitized live-Supabase acceptance checklist *after the migration is actually applied*. A local mock cannot validate a deployment.
3. **Changing event forms, text rules or CSS:** Verify browser clipboard paste, real character-limit disclosure, screen-reader/keyboard access, contrast and 200% zoom. Review related PRs (#38, #42) before merging a downstream branch.
4. **Changing schedule/identity:** Re-run duplicate-title/ID tests, refresh and storage recovery, no public-row mutation and independent-browser separation.
5. **Changing product requirements:** Update the requirement/evidence table and acceptance fixtures in the same PR; do not overstate coverage for proposed map/accounts/Someday features that have no implementation.

## Checks that require human or live environment evidence

The automated suite does **not** prove deployed Supabase RLS/migration status, actual performance at scale, visual correctness at 200% zoom, full WCAG accessibility, representative user success, current CRC/ER correctness, or Kandel's presentation/individual grading requirements. See [Kandel evidence and manual acceptance plan](CSCI187_KANDEL_RUBRIC_EVIDENCE.md) and [existing release matrix](TESTING_STANDARDS_AND_TRACEABILITY.md).

The historical M1/M2 comments are context for future review and do not belong as separate current defects or duplicated regression work.
