# SideQuest — M1 Walking Skeleton: User Specifications

## Purpose and relationship to requirements

These specifications describe the current TypeScript + React implementation. Each one supports the corresponding user requirement (R1–R4) in the User Requirements document. Scope: create an event → store it locally → enter free time → display matching events.

## S1 — Event creation (supports R1)

- The View provides inputs for title, location, date, start time, and end time, plus a “Create event” button.

- The Controller’s createEvent(events, draft, id) trims title/location, requires nonempty values and a valid date, requires same-day start < end, and rejects a duplicate or empty ID.

- If valid, the Controller returns a new event array; the View updates its state and displays confirmation. Invalid submissions return an error and do not add an event.

## S2 — Event list, removal, and persistence (supports R2)

- The View renders “Your created events,” showing each event’s title, location, date, start, and end. Clicking “Remove” excludes that event from View state.

- The Model provides readStoredEvents and saveStoredEvents helpers. The View loads events from localStorage on startup and saves the current list when it changes.

- Local storage is per browser, not a shared database. When writing to storage fails, the View warns that events may not survive a refresh.

## S3 — Availability search (supports R3)

- The View collects a free date, start time, and end time, and calls findEvents(events, date, start, end).

- The Controller rejects a missing/invalid date and invalid or reversed free-time intervals. Otherwise it filters the current event array through the Model’s fitsFully rule, sorts matches by start time, and returns the results.

- fitsFully accepts only an event with the same valid date, an event start at or after the free-time start, and an event end at or before the free-time end. Both windows must have start < end.

- The View shows each matching event’s details and the number of results. No prewritten sample event list is required.

## S4 — Feedback and edge cases (supports R4)

- HTML date/time and required-field controls help users provide expected input types, but validation is also enforced by Controller and Model functions.

- The View displays error messages from createEvent and findEvents, a successful creation message, and a clear empty state when no created events match.

- The Model validates HH:MM with toMinutes, real YYYY-MM-DD calendar dates with isValidDate, and handles corrupted or unavailable browser-storage reads safely.

## CRC — Classes/components, responsibilities, collaborators

### VIEW — app/src/App.tsx

**Responsibilities:** display the event-creation form and availability form; collect input; show errors, confirmation, event cards and saved-event list; maintain React state; load/save browser-local events; allow removal.

**Collaborators:** Controller functions createEvent and findEvents; Model’s readStoredEvents and saveStoredEvents helpers.

### CONTROLLER — app/src/controller/findEvents.ts

**Responsibilities:** validate event-creation and search requests; coordinate Model checks; return { events, error } or { matches, error }; sort valid search matches; keep browser rendering and persistence out of the Controller.

**Collaborators:** View (receives requests and displays results); Model (date/time validation, matching rule, CampusEvent type).

### MODEL — app/src/model/events.ts

**Responsibilities:** define CampusEvent and EventDraft; convert and validate dates/times; determine whether an event fits via fitsFully; serialize and restore locally stored events.

**Collaborators:** Controller for search/creation decisions; View for browser-storage integration.

## End-to-end acceptance check (informal walkthrough)

1. Open SideQuest in a browser. Enter “Art Workshop,” “Arts Building,” a chosen date, and 14:30–15:30; select “Create event.”

2. Confirm the event appears in “Your created events.” Choose that same date and free time 14:00–16:00. Confirm “Art Workshop” appears in “Made for your window.”

3. Change free time to 15:45–17:00, or change to a different date. Confirm “Art Workshop” is not listed as a match.

4. Refresh the same browser and confirm the event is still present if localStorage is available. Select “Remove” and verify the event disappears.

5. Try an event ending before it starts and a reversed search window. Confirm each is rejected with explanatory feedback.

## Verification

- Unit tests live in `app/tests/*.test.ts` and run with `npm test` from `app/`.
- `npm run build` checks TypeScript and produces the React build.
- `.github/workflows/react-ci.yml` runs the tests and build automatically for GitHub pushes and pull requests.

**Historical M1 scope note:** the next agreed M2 MVP focuses on a shared EventCatalog, event posting and browsing, full-fit availability search, and a browser-local personal Schedule. Live imports of SCU events, travel-time checks, registration eligibility, and broader attendance rules are possible **later-product** features, not requirements for the selected M2 MVP.

---

**Related document:** [SideQuest User Requirements](REQUIREMENTS.md) · [Google Docs version](https://docs.google.com/document/d/1yTrAU-RBO4YYBJLUYtjB1kb0U94_vN3iIjDeQBZ-gk0/edit)

## Post-feedback specification addendum (October 28, 2026)

**Status:** The original M1 text above is preserved as the historical submission baseline. The post-feedback behavior below is now **implemented on `master` via merged PR #12**. See [M1 QA checklist](docs/M1_POST_FEEDBACK_QA.md).

### S1a — Event date and description

- Reject creating new events with a date earlier than the user's local calendar date. Product follow-up: also reject an event **starting** before the current local time on today's date; yesterday/today/tomorrow and same-day clock boundaries need regression tests.
- A description field (up to 500 characters) differentiates events with similar titles. Descriptions are optional for compatibility with old browser records and appear in both results and created-event listings.
- The **Model**, invoked through the Controller (not merely the HTML `min` attribute), validates dates, time intervals, title/location lengths, descriptions, and IDs.

### S2a — MVC collaboration and persistence

- **View** collects/render inputs and UI state and invokes Controller functions. It must not import Model helpers directly.
- **Controller** mediates create/search/remove operations, delegates reusable business rules to the Model, loads/persists event state through the Model, and exposes presentation-friendly date/time values.
- **Model** owns the `CampusEvent` schema, local date/time primitives, validation/business rules, matching/filtering, removal/restoration, storage integrity checks and serialization. Existing saved events without descriptions remain valid. Date/time display formatting lives in the separate presentation helper, not in the Model.
- Browser storage remains per device; write failures must surface prominently. Avoid overwriting good saved data after malformed storage reads. Browser tabs can conflict when saving whole arrays; reconcile external writes or document single-tab limitation.

### S3a — Date and time display

- Keep machine-readable date/time data as YYYY-MM-DD and HH:mm. Present dates in M/D/YYYY and times in a 12-hour `h:mmam/pm` display in both results and created-event lists (e.g. 2026-10-27 → 10/27/2026; 14:30 → 2:30pm).
- Date/time inputs use browser-native controls, whose visible locale styling may vary by browser/OS. Automated and manual browser checks should verify the intended display on event cards.

### S4a — Verification

- Verify controller/model edge cases, rendered React UI, real-browser create → match → reload → remove flow, descriptions, date guards, errors, persistence and accessibility.
- The original 26 M1 logic tests were not sufficient proof of UI coverage. [Merged PR #12](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/12) implements the feedback fixes and UI/browser tests together; **59 Vitest cases in 14 files** and a Chromium smoke test passed on its final head. Old PRs #10 and #11 were closed without merging.
