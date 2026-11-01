# SideQuest master-branch code audit and repair plan

**Related full-course review:** [Lecture-by-lecture compliance matrix for all accessible 01–16 decks](COURSE_LECTURES_01_TO_16_COMPLIANCE_AUDIT.md). **Scope clarification:** the original P3 includes partial attendance, travel time, and other capabilities deferred from the later M2 plan. The team confirms Professor Kandel reviewed and approved this narrower scope; document that approval and the deferred features in the current requirements, without treating approval as an outstanding blocker.

**Audit date:** November 1, 2026  
**Baseline:** `master` at `7de3ef9e94fa0e240c042e499c56db6c86118ac3`  
**Proposed fixes:** `fix/m1-full-audit-2026-11-01` (review branch; do not describe as merged until a teammate reviews and merges)  
**Evidence:** Source files, tests, course documents `16_Code_Review.pdf` and `15_SQL_ER_Activity.pdf`, and GitHub CI runs.

## How to read the findings

- **Fixed on review branch:** Change implemented with a regression test where feasible. Still requires green CI and teammate approval.
- **Reviewed, retained:** Behavior is appropriate to the current M1 scope; changing it adds risk without measurable benefit.
- **M2 pending:** Explicit requirement in the team's MVP playbook that the M1 prototype does not yet implement.
- **Needs product decision:** Reasonable alternatives exist; do not quietly choose one in a code cleanup.

This audit distinguishes **what exists in M1 today** from the **M2 shared-catalog and personal-plan design**. It does not claim an actual deployed database, an external security test, or exhaustive accessibility certification.

## Confirmed fixes on this branch

| Area | Finding | Repair and regression |
| --- | --- | --- |
| Storage failures | Deletion and Undo previously claimed success even when saving failed | Report temporary operations accurately; add React tests for both failure paths |
| Temporary events | A second save could mistake this tab's own unsaved state for another-tab conflict | Track the last persisted list separately from the React list; test a failed write followed by a successful post |
| Multiple tabs | Incoming browser storage updates could silently discard unsaved local events | Preserve local events, warn, and refuse an unsafe overwrite; add a React test and a real two-page Playwright test |
| Undo usability | An unrelated invalid form submission could hide the Undo button | Render Undo independently from notice text; verify it remains usable |
| Past labels | A long-open page could show stale past-event badges | Refresh date-dependent presentation periodically |
| Stored data | Old JSON event records bypassed title/location length limits and accepted whitespace-only IDs | Align runtime storage checks with event validation; test corrupted collections |
| Event IDs | Two original ID tests passed because their October fixtures became past events | Supply a fixed test clock and require ID-specific error messages |
| C++ example | `divisor * divisor` could overflow signed int while testing large primes | Compare `divisor <= number / divisor`; add largest-32-bit-prime regression |
| Documentation | Old counts, obsolete migration text, inconsistent setup instructions | Clarify the historical spec, current test coverage, and `npm ci` workflow |

## Files checked

### React application and user interface

| File | Audit outcome |
| --- | --- |
| `app/src/App.tsx` | **Changed:** storage outcomes, persistent baseline, tab warning, Undo availability, and periodic badge refresh |
| `app/src/controller/findEvents.ts` | **Changed:** exposes shared storage key without making the View import the Model |
| `app/src/model/events.ts` | **Changed:** stricter IDs and saved record limits; past-end boundary |
| `app/src/presentation/formatEvents.ts` | **Reviewed, retained:** display formatting separated from business logic |
| `app/src/main.tsx` | **Reviewed, retained:** React bootstrapping and StrictMode |
| `app/src/style.css` | **Changed:** simple styling for independently rendered Undo; extensive minified-style rules are a readability follow-up, not a reason to rewrite visual behavior |
| `app/index.html` | **Reviewed, retained:** root mount point and accessibility-oriented viewport metadata |

### Tests

| File | Audit outcome |
| --- | --- |
| `app/tests/event.ids.test.ts` | **Changed:** fixed test clock and specific errors |
| `app/tests/model.business-rules.test.ts` | **Changed:** storage field limits, blank IDs, and end-time boundary |
| `app/tests/app.m1.integration.test.tsx` | **Changed:** six additional storage, Undo, recovery, and cross-tab cases |
| `app/e2e/m1.spec.ts` | **Changed:** two real tabs sharing and updating the list |
| `app/tests/m1.professor-feedback.test.ts` | **Reviewed, retained:** regression suite; see remaining naming discussion |
| `app/tests/controller.search.test.ts` | **Reviewed, retained:** successful and unsuccessful Controller operations |
| `app/tests/controller.devonny.create-event.test.ts` | **Reviewed, retained:** preservation assertions could compare complete objects |
| `app/tests/model.devonny.clock-time.test.ts` | **Reviewed, retained:** time parser boundaries |
| `app/tests/model.fits.test.ts` | **Reviewed, retained:** matching behavior |
| `app/tests/model.storage.test.ts` | **Reviewed, retained:** storage serialization and invalid JSON |
| `app/tests/availability-boundaries.test.ts` | **Reviewed, retained:** inclusive window boundaries |
| `app/tests/search-filter-and-sort.test.ts` | **Reviewed, retained:** matching and ordering |
| `app/tests/calendar.dates.test.ts` | **Reviewed, retained:** leap years and date format |
| `app/tests/student-save-events.test.ts` | **Reviewed, retained:** removing persisted entries |
| `app/tests/student-storage-errors.test.ts` | **Reviewed, retained:** legacy reader; future addition should assert `blocked: true` in the checked reader |

### Build, dependency, and CI configuration

| File | Audit outcome |
| --- | --- |
| `app/package.json`, `app/package-lock.json` | **Reviewed, retained:** committed lockfile and reproducible commands |
| `app/vite.config.ts`, `app/playwright.config.ts`, `app/tsconfig.json` | **Reviewed, retained:** test discovery, real Chromium config, strict TypeScript |
| `.github/workflows/react-ci.yml` | **Reviewed, retained:** locked install, Vitest, build, Playwright |
| `app/.nvmrc`, `app/.gitignore` | **Reviewed, retained:** Node version and private/generated file exclusions |
| `CMakeLists.txt`, `.github/workflows/ci.yml` | **Reviewed, retained:** still-active independent legacy Qt/C++ starter CI |
| `.gitignore`, `.gitattributes` | **Reviewed, retained:** repository hygiene |

### Legacy C++ starter

| File | Audit outcome |
| --- | --- |
| `src/prime.cpp` | **Changed:** avoid integer overflow |
| `tests/test_prime.cpp` | **Changed:** test large prime |
| `src/prime.h`, `src/main.cpp`, `tests/test_main.cpp` | **Reviewed, retained:** starter example and separate test entry point |
| `tests/doctest.h` | **Retained:** vendored external testing header; do not hand-edit |

### Documentation

| File | Audit outcome |
| --- | --- |
| `README.md` | **Changed:** consistent `npm ci` guidance and test links |
| `TEAM_SETUP_GUIDE.md` | **Changed:** reproducible dependency setup and test commands |
| `SPECIFICATIONS.md` | **Changed:** highlight superseding post-feedback architecture addendum |
| `CODE_WALKTHROUGH.md` | **Changed:** explain pending audit fixes rather than claiming old bug remains unaddressed |
| `docs/MVP_TEAM_PLAYBOOK.md` | **Changed:** stale test count, description migration note, and SQL field-length mismatch |
| `docs/M1_POST_FEEDBACK_QA.md` | **Retained historical M1 evidence:** PR #12 baseline is still valid; audit belongs in this new document |
| `AGENTS.md` | **Reviewed, retained:** existing scope and teammate ownership boundaries |
| `REQUIREMENTS.md` | **Reviewed, retained:** original user requirements and post-feedback addendum |
| `app/README.md` | **Reviewed, retained:** app-level setup |
| `docs/DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md` | **Scope triage:** longer-term research only; no automatic M2 feature expansion |

## Intentional hardcoded values

The main app does **not** hardcode fake event search results. Test records are deliberately fixed so tests are reproducible.

- **Appropriate:** named time constants, SCU branding, a local Playwright test port, and fixtures with an injected clock.
- **Improved:** shared storage key is now obtained through Controller, instead of copying a literal in the View.
- **Review before M2:** event field limits (M1 100/100/500 versus proposed SQL 120/200/2000), Santa Clara campus timezone versus visitor timezone, and initial date/time suggestions.

## Remaining items requiring product/team agreement

1. **Minute precision:** today's event creation accepts starts within the current minute. The existing regression test explicitly expects that. Changing to strict second-level comparison would change behavior, so confirm the rule first.
2. **Storage concurrency:** browser `localStorage` reads and writes are not atomic. The new baseline check reduces accidental overwrites but is not a database transaction. Real shared catalog persistence belongs in M2.
3. **Undo semantics:** currently one removal is undoable; new posting clears the receipt. A general undo history is not part of M1.
4. **Visual quality:** manual small-screen and keyboard/screen-reader checks are still valuable. Automated CI does not certify accessibility.
5. **Data contract:** align SQL/Model/HTML constraints, generated ID ownership, and error states before introducing M2's shared storage.

## M2 requirements not implemented in current source

- A shared `EventCatalog` readable from separate devices, with stable database-generated IDs.
- Browsing and details from actual shared data, including `hostName`.
- A current-device `Schedule` storing planned IDs separately from public events.
- Cross-browser posting and reading, with an isolated per-browser planned list.
- Reviewed SQL migration, RLS permissions, protected credentials, and abuse controls.

These are **future implementation tasks** from the team playbook, not hidden defects in the original M1 walking skeleton.

## Review and acceptance

After the branch CI completes:

1. Inspect the code diff with a teammate; verify no unrelated M2 implementation slipped in.
2. Confirm React/Vitest, Chromium, TypeScript build, and C++/CTest are all green.
3. Reproduce temporary storage failures manually in browser developer tools where feasible.
4. Discuss whether M2 SQL constraints and time-zone behavior should differ from M1.
5. Have a teammate approve the PR before merging into `master`.

Professor Kandel's Code Review deck emphasizes correctness, design, useful comments, meaningful tests, and practical teammate feedback. Her SQL/ER deck requires database access to remain in the Model and calls for clear entity/relationship decisions. A green run checks tested behavior, not every architectural assumption.
