# SideQuest Code Walkthrough (historical M1 teaching example)

> **Historical guide, not the current M2 implementation.** This document preserves the former M1 browser-only example. The actual M2 release **does implement** a shared EventCatalog adapter, Discover/full-fit search, and a device-local My Schedule. For current implementation and grading, start with the [root README](README.md), [technical specifications](SPECIFICATIONS.md), [M2 diagrams/code map](docs/M2_IMPLEMENTATION_DIAGRAMS.md), and [integration verification](docs/M2_INTEGRATION_VERIFICATION.md). Historical UI examples are preserved under `app/tests/fixtures/`; they are not used by the live application.

> **Quick reading path:** Run the app, read the four-file map, follow the event-creation example, then visit the storage and testing sections. Keep this guide open beside VS Code. For M2 architecture and agreed scope, use [the MVP team playbook](docs/MVP_TEAM_PLAYBOOK.md).

## 1. Run SideQuest

From the repository root:

```bash
cd app
npm ci
npm run dev
```

Open the localhost URL printed by Vite, typically `http://localhost:5173/`. `npm ci` installs dependencies using the committed lockfile. `npm run dev` starts the development server. The original C++ coursework starter in the repository root is separate from this React application.

**Historical M1 exercise:** the original version created and removed locally stored records. The old UI is preserved in `app/tests/fixtures/LegacyApp.tsx`. The current running application instead provides **Post an event → Discover → My Schedule** and can access server-backed public events when configured. Personal plan IDs remain device-local.

## 2. Four-file map for historical M1 code (not current production)

| Layer | Start with | Job in plain English |
| --- | --- | --- |
| View | [`app/src/App.tsx`](app/src/App.tsx) | Show forms and events, remember what's on screen, respond to button clicks and input |
| Controller | [`app/src/controller/findEvents.ts`](app/src/controller/findEvents.ts) | Receive requests from the View and ask the Model to do the relevant work |
| Model | [`app/src/model/events.ts`](app/src/model/events.ts) | Define an event, enforce rules, match events to free time, and read/write stored event data |
| Presentation helpers | [`app/src/presentation/formatEvents.ts`](app/src/presentation/formatEvents.ts) | Turn machine-readable dates/times into labels people can read |

The MVC separation is important here: **business rules belong in the Model**. For example, rejecting a past event must work even when there is no visible form. The Controller calls Model rules, while the View calls Controller functions. Formatting is a separate helper because it changes how values look, rather than whether an event is valid.

Think of the request path this way:

```text
Person fills out the form and clicks Create
             |
             v
View: App.tsx / handleCreate()
             |
             v
Controller: createEvent(...)
             |
             v
Model: validateEventDraft(...)
             |
             v
Controller returns { events, error }
             |
             v
View saves/shows the result
```

**One limitation to know:** The View currently coordinates browser storage, tab updates, and UI messages. Reusable event rules remain in the Model. This is the current M1 structure, rather than a claim that all browser orchestration has been extracted from React.

## 3. TypeScript in this project, explained with the real code

### 3.1 An event has a defined shape

In `events.ts`:

```ts
export type CampusEvent = {
  id: string
  title: string
  description?: string
  location: string
  date: string
  start: string
  end: string
}
```

`string` means the value should be text. The `?` makes `description` **optional**, so older saved events without descriptions still work. The app stores date strings like `2026-11-03` and time strings like `14:30`. The types describe their shape, while functions such as `isValidDate` and `toMinutes` check whether those strings are actually valid.

`EventDraft = Omit<CampusEvent, 'id'>` means “the same fields as an event, except its ID.” The form gathers a draft; the application assigns its ID when creating the event.

`Pick<EventDraft, 'date' | 'start' | 'end'>` means “an object containing only these three fields from a draft.” The Controller uses this to return initial date/time form values.

`type CampusEvent[]` means “an array of events,” rather than one event.

### 3.2 What `null`, `undefined`, and `?` mean here

`toMinutes(time)` returns either a number or `null`. `null` signals “this string is not a valid `HH:MM` clock time,” so callers check it before doing arithmetic.

In `draft.description?.trim() ?? ''`:

- `?.` trims the description **only if it exists**.
- `?? ''` supplies an empty string if the value is `null` or `undefined`.

In `{ ...events, }`-style expressions, `...` usually spreads values from another object or array. For example, `[...events, event]` builds a new array containing all old events plus one new event.

### 3.3 Types help development, but Model validation protects behavior

TypeScript can flag invalid shapes as we write code. However, data from user forms or `localStorage` still needs validation at runtime. This is why `validateEventDraft`, `isCampusEvent`, and `readStoredEventsChecked` all exist.

## 4. Follow one event all the way through

Try creating “Art Workshop,” on a future date, from `14:30` to `15:30`.

1. **View gathers input.** `App.tsx` holds the draft fields in React state, then `handleCreate()` runs when the form is submitted.
2. **A unique ID is generated.** `crypto.randomUUID()` produces an identifier, allowing multiple events to share a title.
3. **Controller receives the request.** `createEvent(events, draft, id)` calls `validateEventDraft` in the Model.
4. **Model checks the rules.** It trims text; checks title, location, description length, real calendar date, start/end order, past date/time, and duplicate IDs.
5. **Controller returns a result.** Successful results contain a new array and `error: null`. Failed results contain the original array and an error message.
6. **View attempts to save.** `store()` checks the latest browser data, then calls `persistEvents`, which reaches `saveStoredEvents` in the Model.
7. **View gives feedback.** React updates the event list, the available-time search, and a success or warning message.

Relevant code:

```ts
const result = createEvent(events, draft, crypto.randomUUID())
if (result.error) {
  setCreateError(result.error)
  return
}
const outcome = store(result.events)
```

Notice that the error check happens **before** the save. Also notice that the Controller returns data instead of directly changing the visible React component.

## 5. How event matching works

The M1 search asks a narrow question: **Does the entire event fall on my chosen date and inside my free-time window?**

For example, when free time is `14:00` through `16:00`:

| Event | Match? | Reason |
| --- | --- | --- |
| 14:30–15:30 on the selected date | Yes | Entire event fits |
| 14:00–16:00 on the selected date | Yes | Boundaries count as fitting |
| 15:00–17:00 on the selected date | No | Event ends too late |
| 14:30–15:30 on another date | No | Calendar date differs |

The Model's `fitsFully()` compares the dates and converts `HH:MM` into minutes since midnight. It uses inclusive edges, `start <= eventStart` and `eventEnd <= end`, after confirming valid intervals. `matchingEvents()` filters the list and sorts the matches by starting time.

The View recomputes search results from its current event array and the currently selected free-time inputs. The displayed number of matches therefore updates when those inputs change; there is no separate Search button.

## 6. React basics you'll see in App.tsx

### 6.1 React state

```tsx
const [events, setEvents] = useState<CampusEvent[]>(initial.events)
```

- `events` is the current value for this render.
- `setEvents(newValue)` asks React to update it and render again.
- `useState<CampusEvent[]>` tells TypeScript that the state is a list of events.

Changing a normal local variable does **not** tell React to update the UI. Calling its state setter does.

`draft` stores the values currently typed into the form, while `events` stores the list shown in the app. The form's `value={draft.title}` and `onChange` handler make its input a **controlled input**: React state is the value shown on screen.

### 6.2 React effects

`useEffect(..., [])` in this app registers a listener for the browser's `storage` event. That event helps a tab notice changes saved by another tab. The returned function removes the listener when the component is unmounted.

The empty dependency array `[]` means the effect is set up on mount rather than after every normal update. In development, React Strict Mode may perform an extra setup/cleanup cycle to help expose mistakes.

### 6.3 JSX and event handlers

`App.tsx` is **TSX**, meaning TypeScript plus JSX (tags that describe the interface). `onSubmit={handleCreate}` tells React which function to run for a form submission. `event.preventDefault()` prevents the browser's usual form submission/navigation.

`{matches.map(event => (...))}` builds one visible card per matching event. `key={event.id}` helps React keep track of which card corresponds to which event.

`role="alert"`, `role="status"`, and `aria-label` are accessibility attributes that help assistive technology describe controls and messages.

## 7. Dates and times are deliberately stored differently from display

The Model stores `2026-10-27` and `14:30` because they're easy to validate and compare. The formatting helper displays `10/27/2026` and `2:30pm` to users.

Why does `toMinutes('14:30')` equal `870`? Because `14 * 60 + 30 = 870`. That makes comparisons like “does this start before that end?” straightforward.

`todayLocalISO()` uses local date fields instead of turning the current time into UTC. That avoids selecting the wrong calendar date near local midnight. The default event window is chosen in the Controller, with a future start and a one-hour duration; late at night it chooses tomorrow.

**Known boundary for future review:** the same-day “already started” check currently compares at minute precision, not seconds. This is already tracked in the code-review comments; this guide does not change it.

## 8. Browser storage, recovery, and Undo

### 8.1 What localStorage actually does

`localStorage` is a small key/value store provided by the browser. It persists across normal refreshes in the same browser and site, but it is **not** a shared database and is not a backup service.

`saveStoredEvents()` turns the array into a JSON string using `JSON.stringify` and writes it under `STORAGE_KEY`. `readStoredEventsChecked()` parses JSON back into records and checks their validity.

### 8.2 Why `blocked` exists

If saved data is damaged, the Model can return `{ events: validRecoveredEvents, blocked: true }`. The View then blocks modifications and offers a recovery confirmation rather than silently overwriting damaged data.

A failed browser write returns `false`, allowing the View to warn users that changes might disappear after refresh. This is distinct from an invalid event, which the Model rejects before saving.

### 8.3 Two browser tabs and stale data

Imagine Tab A and Tab B both load the same events. Tab B saves a change first. If Tab A then writes an older copy, it could erase Tab B's changes.

Before saving, `App.tsx` compares its event list with the latest stored version using JSON strings. If the lists differ, it refuses the stale write, reloads the latest list, and asks the user to retry. The `storage` listener also updates a tab after another tab changes the storage.

This is **best-effort protection**, not a guaranteed atomic database operation.

### 8.4 Removing and restoring an event

The Model's `removeEventFromList()` returns an updated list plus a “receipt” containing the removed event and its old position. `restoreEventInList()` uses that receipt for the one-step Undo action.

**Known follow-up:** the existing UI can still say “Event removed” when the browser fails to persist a deletion, although a warning is also displayed. That issue is documented in the merged PR's review comments and is **not fixed by these explanation-only changes**.

## 9. How to read and write meaningful tests

The project uses Vitest for Model, Controller, and rendered React tests. Playwright runs a real Chromium browser test.

A typical unit test:

```ts
it('rejects an invalid clock minute', () => {
  expect(toMinutes('09:60')).toBeNull()
})
```

- `it(...)` names a behavior we expect.
- `expect(...)` evaluates the **real function's output**.
- `toBeNull()` checks the exact expected result.

Tests should fail if the behavior they're named after breaks. For instance, checking only that *some* error exists cannot prove duplicate-ID validation works: an unrelated past-date error may also satisfy that assertion.

### A dependable test clock

When testing the rule “past events are rejected,” pass a known clock:

```ts
const now = new Date(2026, 9, 1)
const result = createEvent([], draft, 'event-1', now)
```

A fixed `now` makes the test predictable in November, December, or next year. Real browser tests instead use dates computed in the future so they do not expire.

### Where to find tests

| Location | Purpose |
| --- | --- |
| [`app/tests/model.business-rules.test.ts`](app/tests/model.business-rules.test.ts) | Isolated Model validations, search, and list rules |
| [`app/tests/controller.search.test.ts`](app/tests/controller.search.test.ts) | Controller creation/search behavior |
| [`app/tests/app.m1.integration.test.tsx`](app/tests/app.m1.integration.test.tsx) | React form interactions, UI messages, and simulated browser storage |
| [`app/e2e/m1.spec.ts`](app/e2e/m1.spec.ts) | Real Chromium create/search/reload/remove flow |
| [`.github/workflows/react-ci.yml`](.github/workflows/react-ci.yml) | GitHub Actions commands run after pushes and PRs |

From `app/`, run:

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

A passing run is good evidence, but a test can still pass for the wrong reason. When reviewing a test, ask: **If the named behavior stopped working, would this specific assertion fail?**

## 10. Debugging: where to start

| What you see | First place to check |
| --- | --- |
| Event isn't created | Model's `validateEventDraft()`, then Controller's `createEvent()` |
| Valid event doesn't match free time | Model's `fitsFully()`, then `matchingEvents()` and search inputs in View |
| Time/date label looks strange | `presentation/formatEvents.ts` |
| Event disappears after refresh | Browser's local storage, `store()`, and `saveStoredEvents()` |
| App says saved data is damaged | `readStoredEventsChecked()` and the View's recovery action |
| A React button doesn't update the screen | Check the handler and whether it calls a state setter |
| A test unexpectedly fails after a few days | Check whether its event fixture has become a past date |
| Everything works locally but CI fails | Check the failing step under GitHub Actions, then run the same command in `app/` |

**Learning exercise:** Trace “Create event” from the button to `handleCreate()`, to Controller `createEvent()`, to Model `validateEventDraft()`, and back to `store()`. If you can explain what value gets passed and returned at every step, you understand the most important M1 path.

## 11. Commenting conventions for our team

### Visual cues in comments

We use a few topic-specific emojis to make unfamiliar code easier to scan: 🔑 for unique IDs, 📅 for dates, ⏰ for time checks, 💾 for browser storage, 🧯 for corrupted data, 🧩 for keeping existing state intact, 🔎 for searches, and 🌐 for actual browser tests. These are signposts for a useful explanation, not decorations for every line.

A good comment answers one of these questions:

- **Why** is this rule or safeguard necessary?
- **What surprising case** does it protect against?
- **What does this function return**, especially if it can return an error or a recovery flag?
- **Why is this layer responsible** rather than another one?

Prefer a short note above a difficult function or a surprising decision. Avoid comments that simply translate visible code, such as `// Increment i` above `i++`. If a block is so long that it needs paragraph after paragraph of explanation, consider splitting it when an actual code-change PR is appropriate.

### Before you move to M2

Read [`docs/MVP_TEAM_PLAYBOOK.md`](docs/MVP_TEAM_PLAYBOOK.md) for the **agreed M2 requirements**. The current M1 app creates and searches browser-local events. A public EventCatalog and personal Schedule are separate planned work; writing documentation about them does not implement them.

---

**Changes represented by this guide:** documentation and explanatory source comments only. They do not alter event rules, UI behavior, persistence, tests, or dependency versions.
