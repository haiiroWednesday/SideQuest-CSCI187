# SideQuest — M1 Walking Skeleton Specifications

These are M1-scoped technical specifications, to be reviewed against the team's CRC/system architecture.

## View — `app/src/App.tsx`

- Display an event-creation form with title, location, date, start time and end time.
- Display the events created in this browser, with an option to remove an event.
- Collect the user's free date and time window and display matching event cards.
- Display descriptive messages for invalid input, zero matches, and unavailable browser storage.

**Collaborates with:** Controller for creation/search; Model storage functions for browser persistence.

## Controller — `app/src/controller/findEvents.ts`

- `createEvent(events, draft, id)`: validate nonempty title/location, valid calendar date, chronological same-day times, and unique ID; return a new event list or an error.
- `findEvents(events, date, start, end)`: validate the search interval, ask Model's matching rule to filter created events, and return matches sorted by start time.
- Pass data to the View; do not render user-interface elements or access browser storage.

**Collaborates with:** View (receives requests and returns results), Model (date/time and matching rules).

## Model — `app/src/model/events.ts`

- Define a `CampusEvent` with ID, title, location, date, start and end.
- `toMinutes` validates and converts `HH:MM` strings; `isValidDate` checks real calendar dates.
- `fitsFully` only returns true if the event and search dates agree and its full duration fits within the interval.
- `readStoredEvents` and `saveStoredEvents` load/persist events through browser localStorage; invalid/corrupt data fails safely.

**Collaborates with:** Controller for matching/validation, View for persistence.

## End-to-end acceptance example

1. Open the app: there are **no sample events**.
2. Create "Art Workshop" on today's date, 14:30–15:30, at "Arts Building".
3. Set free time to the same date, 14:00–16:00. Art Workshop appears.
4. Set free time to 15:45–17:00. The workshop disappears.
5. Refresh the browser. The created event is still listed and searchable **in that browser**.

## Testing / CI

- `npm test`: automated Vitest unit tests for creation, validation, matching and storage.
- `npm run build`: TypeScript check and production build.
- `.github/workflows/react-ci.yml`: runs checks on GitHub after pushes and pull requests.
- For M1, each student must author a distinct, named unit test and demonstrate a deliberate CI failure followed by a successful run on a separate branch. Starter tests are not individual submissions.
