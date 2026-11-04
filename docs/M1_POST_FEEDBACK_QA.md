# M1 feedback follow-up and regression checklist

> **Status (October 29, 2026):** Code PR #12 is **merged into `master`**, merge commit `6e461fd15421f70591799d599d12075b553262d9`. Final PR-head checks: **59/59 Vitest cases in 14 files**, TypeScript/Vite build, and **1/1 Playwright Chromium smoke**. The original baseline M1 documents remain preserved, with post-feedback addenda.

## Feedback, acceptance criteria, and evidence

| Area | Expected behavior | How to verify |
|---|---|---|
| Create event | Reject invalid dates and past **dates** using the local calendar, not UTC | Yesterday rejected; today and tomorrow accepted; impossible dates rejected; test around midnight |
| Already-ended same-day event | Additional product safeguard: do not offer new events whose **start time** is already in the past | Same-day earlier start rejected, future start accepted; clarify expectations if the assignment only requires dates |
| Description | A short optional description can distinguish two events with identical titles | Create two different descriptions; show both in search and saved-event list; save/reload |
| Legacy storage | M1 records without a description remain valid | Load legacy records, modify/add new events and preserve old ones |
| MVC | React View calls Controller, not Model directly; Controller coordinates storage, matching and event actions | Inspect imports, collaborators and side effects; do not hide business rules in the View |
| Time/date presentation | Dates show M/D/YYYY and times show 12-hour am/pm in both event lists | e.g., 2026-10-27 → 10/27/2026; 14:30 → 2:30pm; noon/midnight |
| Event removal | Removal is deliberate and recoverable | UI confirmation or Undo; storage updated; removal of one event never removes another |
| Storage resilience | Corrupted/blocked storage never crashes the app; do not silently discard user data | Test unavailable, malformed, and mixed-validity records; warn clearly |
| Multiple browser tabs | Avoid overwriting another tab's changes | Use cross-tab notification or single-writer guidance; test add/remove in separate tabs |
| UI | Keyboard-accessible fields, messages and controls | Run browser smoke test and inspect small screens, screen reader labels, focus indicators, contrast |
| Testing | All original M1 requirements and new feedback covered | Unit, React integration, and real-browser tests all run under CI; no hardcoded dates that go stale |

## Architectural responsibilities (target after the fixes merge)

- **View (`app/src/App.tsx`)**: render and collect inputs, show messages, own ephemeral form state; call Controller operations for event reads/writes, creation, removal, matching and rendering-friendly data.
- **Controller (`app/src/controller/findEvents.ts`)**: validate user commands, apply date/time rules, create/remove events, coordinate Model persistence and matching; expose a minimal interface to the View.
- **Model (`app/src/model/events.ts`)**: event shape, date/time primitives, validation, search predicate, local storage serialization and integrity checks. Display formatting should remain separate from core domain validation, accessed by the View only through a presentation adapter/Controller.
- **M1 limitations**: events in browser-local storage are private to that device. **M2 is different**: shared public EventCatalog with locally stored personal Schedule IDs; never treat deleting a personal plan as deleting a public event.

## Completed code integration

- [Merged PR #12](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/12) combines the feedback fixes and React/browser tests; earlier PRs #10 and #11 were closed without merging.
- Both original requirements and professor-specific M1 fixes are now in `master`; the View accesses the Model through Controller mediators, and reusable business rules live in `app/src/model/events.ts`.
- Final PR-head CI: [SideQuest React CI run](https://github.com/haiiroWednesday/SideQuest-CSCI187/actions/runs/40988470385), head `58f8b29b01044b864d16a9b81b27444fa919e0cf`: 59 passing Vitest tests, production build, one passing Chromium browser smoke test.
- Merge commit: [`6e461fd`](https://github.com/haiiroWednesday/SideQuest-CSCI187/commit/6e461fd15421f70591799d599d12075b553262d9).
- **Team process caveat:** No teammate GitHub review had been submitted before the user explicitly authorized the merge. A successful build does not substitute for peer review or course reflection evidence.
- **Professor access, verified November 4:** the correct GitHub account `jkandel-scu` has write access to the repository.

## Alignment with Professor Kandel's CSCI 187 lecture slides

| Source | Lecture expectation | Verified code/remaining process |
|---|---|---|
| [11 — Walking Skeleton](https://docs.google.com/presentation/d/1W_RSFcWNTL-NINOeRiGBVvvOtcZncaio5pE5-QtSRmw/edit) | Minimal working end-to-end feature with a functioning front end; README, user requirements and specifications | Create → save locally → enter free window → find matching event → remove. React browser smoke covers this. README, R1–R4, specs exist |
| [08 — System Architecture Activity](https://docs.google.com/presentation/d/18jfC9C54_BebvVjWROKLt96iW1s0e33h7IHxKSawpGA/edit) | Reusable validation and business rules belong to the **Model**, not the View; trace collaborations | Model owns `validateEventDraft`, `validateSearchWindow`, `matchingEvents`, `fitsFully` and removal rules. Controller mediates View requests. Direct Model tests added |
| [12 — Git, Unit Testing & CI](https://docs.google.com/presentation/d/1zfGGMFETie0Z4uOHu3T1N6hNOPRdU6MfhWKSiWX0C3I/edit) | Real function assertions, normal/boundary/invalid cases, CI on pushes/PRs; review changes before merge | Vitest 59/59, real Chromium 1/1, locked `npm ci`, PR #12 merged with passing checks. **Human peer-review evidence not recorded** |
| [13 — Clean Code & Documentation](https://docs.google.com/presentation/d/1PHrPPbAgmuRK1Nx4yscSPgbZCXcMPePesPGj-Oa2IZ8/edit) | Meaningful names, focused responsibilities, named constants, concise setup docs | Named event limits/default-time constants, separate Model/Controller/View/presentation helpers, reproducible `npm ci` documented |
| [10 — Peer Review & Implementation](https://docs.google.com/presentation/d/1YxzkSxyK5kZIJjCdwa69SmrmPgtytcaWBwcARaJGcm0/edit) | M1 is the walking skeleton; M2 Part 1 is the **MVP prototype**, a separate milestone | **Do not represent the merged M1 fixes as completing M2**. Its public EventCatalog and personal Schedule are separate unfinished work |

**Outside source control:** teammate reflections, individually documented red-X→green CI exercises, assignment submission in Camino/Gradescope, professor access to the private repository, and human review are not proved by these code checks.

## Known improvement backlog (not automatically M1 point deductions)

- Make low-contrast gray/green text darker (small normal text should aim for WCAG AA 4.5:1).
- Add better feedback for storage quota/write failures and avoid overwriting an existing list with empty data after a failed read.
- Continue testing cross-tab conflicts and stale saved events; the M1 version now rejects a detected stale write and labels expired saved entries.
- Preserve and update the committed `app/package-lock.json`; CI already uses `npm ci`.
- Keep shared EventCatalog and browser-local personal Schedule strictly separate when implementing M2.

## Verification commands (on merged code)

From `app/`: `npm ci`, `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e`.

**Be precise:** PR #12 is merged; M1 post-feedback code is on `master`. The broader M2 prototype and process/submission evidence still require separate completion.

