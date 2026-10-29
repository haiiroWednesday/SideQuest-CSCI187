# M1 feedback follow-up and regression checklist

> Status (October 28, 2026): **Documentation is published on `master`**. The implementation fixes and expanded tests remain **unmerged code pull requests**. A passing CI check on an individual PR is not evidence that the combined changes work. Do not describe features as shipped until the consolidated PR is merged.

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

## PR integration instructions

1. [PR #10 — React/browser regression tests](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/10) and [PR #11 — instructor feedback fixes](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/11) were created independently. **Do not merge both blindly.**
2. Consolidate the actual behavior and tests on one feature branch, updating `app/README.md` as needed. The key interaction is that PR #10 uses fixed Oct 28 dates and PR #11 rejects past dates. Inject the test clock or generate future dates in every browser test.
3. Run the complete suite, typecheck/build and browser smoke **on the consolidated head**. Evaluate tests for descriptions, rejected old date/time, formatted dates, invalid input, persistence, empty states and removals.
4. Reviewer checks UI, MVC and remaining constraints; only then merge the code. Keep this documentation in sync after merging.

## Known improvement backlog (not automatically M1 point deductions)

- Make low-contrast gray/green text darker (small normal text should aim for WCAG AA 4.5:1).
- Add better feedback for storage quota/write failures and avoid overwriting an existing list with empty data after a failed read.
- Handle duplicated IDs, simultaneous browser tabs and stale saved events deliberately.
- Keep a dependency lockfile in `app/` and use reproducible `npm ci` in CI.
- Keep shared EventCatalog and browser-local personal Schedule strictly separate when implementing M2.

## Verification commands (after code PR merge)

From `app/`: `npm ci`, `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e`.

**Never confuse “documented,” “in an unmerged PR,” and “verified on master.”** Record exact commit and successful CI run in final submission notes.
