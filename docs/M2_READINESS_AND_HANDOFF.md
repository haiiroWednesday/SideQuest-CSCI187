# M2 requirement evidence and handoff

Rechecked November 4, 2026 against the original lecture decks 01–16 and the current M2 Part 1 and Part 2 instructions. The [lecture audit](COURSE_LECTURES_01_TO_16_COMPLIANCE_AUDIT.md) links every deck. The following evidence distinguishes implemented behavior from live or human acceptance.

## M2 Part 1 deliverables

| Required item | Repository evidence | Status / remaining evidence |
| --- | --- | --- |
| MVP code | `app/src`, `app/server`, unchanged SQL migration | Posting, discovery, full-fit search and device-local planning are integrated in master through #21. Live shared database acceptance is pending. |
| Happy paths for every core feature | `app/tests/m2.integration.regressions.test.tsx`, `app/tests/catalog.server.test.ts`, `app/e2e` | Tests exercise post/browse/search/plan/reload/remove, including independent browser sessions against a controlled backend. |
| Errors and boundaries | Tests for timing, stale/deadline reads, corrupt/denied storage, field limits, overlapping/back-to-back plans, HTTP and SQL permissions | Automated evidence, not a substitute for checking the hosted database. |
| Current CRC | `docs/diagrams/M2_IMPLEMENTATION.drawio`, CRC page and SVG preview | Maps current responsibilities and collaborators. P4 remains approved and unchanged. |
| Current ER | Same draw.io, storage page and SVG preview | One implemented SQL events table; local ID plans explicitly outside SQL. Broader P5 entities are not claimed as deployed tables. |
| README | Root and `app/README.md` | Current Node runtime, server-only configuration, dev/production/test commands and fallback limitations. |
| REQUIREMENTS | `REQUIREMENTS.md` | Main feature headers R1–R5 with acceptance criteria and deferred scope. |
| SPECIFICATIONS | `SPECIFICATIONS.md` | Actual Model/Controller/View contract, validation, storage, server/API and failure handling. |
| Instructor access / submission | Professor account `jkandel-scu` previously verified with repository write access | Confirm the actual course-portal submission and include every group member; code changes cannot establish submission. |

The assignment asks for meaningful feature/failure coverage, not a minimum test count. The merged #21 release passed 300 unit/rendering tests, 15 browser checks, TypeScript/browser/server builds, credential scanning, PostgreSQL 16 permissions/constraints and course C++ CI. This follow-up adds coverage for partial-filter feedback and recovering from no matches. Use its exact CI result for the new total.

## Review conclusions about Cynthia's work

The UI work has reached production integration in the repository. The three routes, shared visual system and presenter-driven Discover/Schedule are present. The older PR #23 is not the current integration baseline. Its App still includes legacy browser persistence and relies on older boot/catalog wiring, so merging that entire draft onto the release would undo reviewed changes. Preserve it as history and submit incremental changes from current master.

No evidence here establishes a hosted deployment, a human usability session or that Cynthia authored teammates' Model modules. The contribution record should credit the UI/presenter and integration work accurately, alongside Daven's catalog/posting and Sembiyan's search/Schedule work and Devonny's browse/details responsibility.

## Concrete remaining work

1. **Daven with integration support:** configure server-only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in an authorized Node environment. Verify the migration and real anonymous SELECT/approved INSERT, with UPDATE/DELETE denied. No real credentials go in Git or browser code.
2. **Team live acceptance:** post in Browser A, load in an independent Browser B, filter and plan in B, reload, remove B's plan, and confirm A still sees the event. Record the environment, date, result and any failure. Test fixtures and isolated PostgreSQL already pass but do not certify the hosted instance.
3. **Cynthia + Devonny:** walk through Discover/details/Post/Schedule at phone and desktop widths and by keyboard with a real person. Record concrete observations, fixes and remaining problems. Review the final integrated App rather than the older PR screenshot alone.
4. **Group submitter:** verify the M2 Part 1 portal submission, group names, instructor access and current diagram links. The assignment document and lecture deadline announcements differ, so confirm the applicable date in the portal rather than infer it from a repository file.
5. **Cynthia individually:** complete [M2 Part 2](https://docs.google.com/document/d/1qIx_8k4ZOGWPrISXNYXf-sOifYsXk3SWoPVkoOBP3es/edit) in a separate viewable Google Doc and submit its link in Camino. The document states November 9 before class. It asks for specific peer/code review feedback, actual contribution and teamwork, diagram changes/reasons, and the final-feature division with internal milestones. Discuss diagram changes with teammates; do not invent a Nov. 9 review session before it occurs.

Final-project CRC/ER drawings are a separate Part 2 planning task. If the final scope adds no entities/classes, the assignment permits retaining the drawings with a reason. Do not add accounts or availability tables just to make the diagram bigger, or treat acceptance of P4 as a waiver of the current M2 diagram deliverables.

## Review basis

- [M2 Part 1](https://docs.google.com/document/d/1_LlAb9mtASfutgVjKdjjt7Esh7g0ab6J4FmCzREJDEU/edit): code/tests/current CRC and ER/README/requirements/specifications; repository sharing and group submission.
- Lectures 05, 07–08, 12–16: visible state and recovery; Controller mediation and Model rules; meaningful tests; accurate setup; actual ER/storage; review that evaluates intent as well as tests.
- Server-only database credentials are the implemented project security contract. The retrieved SQL lecture explicitly places SQL in the Model; the server-key contract is documented separately in the project instructions.
