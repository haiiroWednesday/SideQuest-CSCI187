# SideQuest M1 — Eight Unit-Test Starter Examples

These examples are tailored to **our real TypeScript/React functions** on the `react-starter` branch.

**For our four teammates:** Pick different test *behaviors*. Each example below is a working starting point; do not just paste it unchanged and put your name on it. Make an original, meaningful extension (a boundary case, additional scenario, or stronger assertions), understand why the result is expected, and put your name in a comment at the top of **your own test file**. Check with your teammates to avoid testing the same thing.

These examples live in this **guide**, not in `app/tests/`; therefore they do not automatically count as anyone's authored M1 test.

## How to use a sample

1. Open VS Code in the `SideQuest-CSCI187` project.
2. In the `app/tests/` folder, create a **new file** with one of the filenames suggested below (ending in `.test.ts`).
3. Paste the sample for that category. The `../src/...` imports work from `app/tests/`.
4. Modify or extend it to cover your own carefully chosen case. Replace `[Your Name]` in the comment with your real name **only after doing your own test work**.
5. Inside the `app/` folder run `npm test` and `npm run build`.
6. Commit your work. For M1, separately do your deliberate red-X → green-check CI exercise on a temporary branch (not on the team's shared branch).

**Code facts:** `createEvent(events, draft, id)` returns `{events, error}`; `findEvents(events, date, start, end)` returns `{matches, error}`. The Model offers `isValidDate`, `toMinutes`, `fitsFully`, `readStoredEvents`, and `saveStoredEvents`.

---

## 1. Event creation — successful creation

Suggested file: `app/tests/student-create-event.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { createEvent } from '../src/controller/findEvents'

it('creates an event and trims accidental spaces', () => {
  const result = createEvent([], {
    title: '  Coding Workshop  ',
    location: '  Library  ',
    date: '2026-10-23',
    start: '14:00',
    end: '15:00',
  }, 'coding-1')

  expect(result.error).toBeNull()
  expect(result.events).toHaveLength(1)
  expect(result.events[0].title).toBe('Coding Workshop')
  expect(result.events[0].location).toBe('Library')
})
```

**Make it yours:** Check that adding a second valid event preserves the first event, or verify all the other stored fields.

## 2. Duplicate events — reject a reused ID

Suggested file: `app/tests/student-duplicate-id.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { createEvent } from '../src/controller/findEvents'

it('does not create another event using an existing ID', () => {
  const draft = {
    title: 'Study Group',
    location: 'Library',
    date: '2026-10-23',
    start: '16:00',
    end: '17:00',
  }
  const first = createEvent([], draft, 'same-id')
  const second = createEvent(first.events, { ...draft, title: 'Choir' }, 'same-id')

  expect(second.error).not.toBeNull()
  expect(second.events).toHaveLength(1)
  expect(second.events[0].title).toBe('Study Group')
})
```

**Make it yours:** Try a blank ID and check that no event gets added; also test that a different ID *does* get added.

## 3. Calendar dates — reject impossible dates

Suggested file: `app/tests/student-date-validation.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { isValidDate } from '../src/model/events'

it('rejects a non-existent calendar date', () => {
  expect(isValidDate('2026-04-31')).toBe(false)
  expect(isValidDate('2026-04-30')).toBe(true)
  expect(isValidDate('2027-02-29')).toBe(false)
})
```

**Make it yours:** Explore leap years, invalid months, or malformed date strings.

## 4. Clock-time input — handle midnight and the end of the day

Suggested file: `app/tests/student-clock-times.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { toMinutes } from '../src/model/events'

it('converts valid boundary clock times and rejects 24:00', () => {
  expect(toMinutes('00:00')).toBe(0)
  expect(toMinutes('12:00')).toBe(720)
  expect(toMinutes('23:59')).toBe(1439)
  expect(toMinutes('24:00')).toBeNull()
})
```

**Make it yours:** Test missing leading zeros, invalid minutes, or an empty time.

## 5. Availability matching — reject an event starting one minute too early

Suggested file: `app/tests/student-start-boundary.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { fitsFully, type CampusEvent } from '../src/model/events'

it('rejects an event that starts one minute before free time', () => {
  const event: CampusEvent = {
    id: 'early',
    title: 'Art Club',
    location: 'Arts Building',
    date: '2026-10-23',
    start: '13:59',
    end: '14:30',
  }

  expect(fitsFully(event, '2026-10-23', '14:00', '15:00')).toBe(false)
  expect(fitsFully(event, '2026-10-23', '13:59', '15:00')).toBe(true)
})
```

**Make it yours:** Test an event ending one minute too late or an event exactly matching both boundaries.

## 6. Search results — order matching events chronologically

Suggested file: `app/tests/student-sorting.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { findEvents } from '../src/controller/findEvents'
import type { CampusEvent } from '../src/model/events'

it('lists qualifying events from earliest to latest', () => {
  const events: CampusEvent[] = [
    { id: 'later', title: 'Choir', location: 'Hall', date: '2026-10-23',
      start: '16:00', end: '16:30' },
    { id: 'earlier', title: 'Art Club', location: 'Studio', date: '2026-10-23',
      start: '14:00', end: '15:00' },
  ]

  const result = findEvents(events, '2026-10-23', '13:00', '17:00')

  expect(result.error).toBeNull()
  expect(result.matches.map(event => event.id)).toEqual(['earlier', 'later'])
})
```

**Make it yours:** Add an event on a different date or outside the window, and prove it is excluded *without* changing the sort order.

## 7. Browser storage — save and restore multiple events

Suggested file: `app/tests/student-save-events.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { readStoredEvents, saveStoredEvents, type CampusEvent } from '../src/model/events'

it('restores both saved events in the original order', () => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value) },
  }
  const events: CampusEvent[] = [
    { id: 'one', title: 'Art', location: 'Studio', date: '2026-10-23',
      start: '14:00', end: '15:00' },
    { id: 'two', title: 'Music', location: 'Hall', date: '2026-10-23',
      start: '16:00', end: '17:00' },
  ]

  expect(saveStoredEvents(storage, events)).toBe(true)
  expect(readStoredEvents(storage)).toEqual(events)
})
```

**Make it yours:** Replace the saved list with a shorter list, then verify the removed event does not come back after restoring.

## 8. Storage errors — handle blocked browser storage safely

Suggested file: `app/tests/student-storage-errors.test.ts`

```ts
// Author: [Your Name] — extend this example with your own scenario.
import { expect, it } from 'vitest'
import { readStoredEvents, saveStoredEvents } from '../src/model/events'

it('does not crash when browser storage is blocked', () => {
  const blocked = {
    getItem: (_key: string): string | null => {
      throw new Error('Storage blocked')
    },
    setItem: (_key: string, _value: string): void => {
      throw new Error('Storage blocked')
    },
  }

  expect(readStoredEvents(blocked)).toEqual([])
  expect(saveStoredEvents(blocked, [])).toBe(false)
})
```

**Make it yours:** Check corrupt JSON and verify that reading returns an empty list instead of crashing.

---

## What the four teammates need to submit

There are **eight options**, but **four teammates**. Each person should pick a **different category**, then write their own meaningful test case in a new file. A category is an idea, not a completed student assignment. Do not claim that these AI-written examples were individually authored.

When you have picked, tell the group which category you're taking. You can use more than one test in your own file.

## Run your tests

From `SideQuest-CSCI187/app/`:

```bash
npm test
npm run build
```

The `.github/workflows/react-ci.yml` workflow automatically runs tests and a build on GitHub when code is pushed.

## Prove CI catches a mistake (separate branch)

After your own test passes, create a **separate demonstration branch**, change an `expect(...).toBe(...)` assertion to deliberately expect an incorrect value, commit and push. Confirm a **red X** in GitHub Actions and keep the run URL. Restore the correct assertion, commit and push again, then confirm **green** and keep the second run URL. Do **not** merge an intentionally failing test into the shared branch.

The assignment still requires **everyone to understand their own code** and to add their name as a comment in their individually authored test.
