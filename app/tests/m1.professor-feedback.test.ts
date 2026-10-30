// Regression tests for the professor's M1 walking-skeleton and MVC feedback.
import { describe, expect, it } from 'vitest'
import {
  createEvent, displayDate, displayTime, loadEvents, persistEvents,
  removeEvent, removeEventWithReceipt, restoreRemovedEvent, loadEventsChecked, todayLocal, initialEventWindow,
} from '../src/controller/findEvents'
import type { CampusEvent, EventDraft } from '../src/model/events'
import { STORAGE_KEY } from '../src/model/events'

const draft: EventDraft = {
  title: ' Campus Choir ', description: '  Learn new arrangements with friends.  ',
  location: ' Music Hall ', date: '2026-10-29', start: '14:30', end: '15:30',
}
const localNow = new Date(2026, 9, 28, 20, 58) // Oct 28, 8:58 pm in the runner's local timezone

describe('M1 professor feedback: no past event dates', () => {
  it('rejects yesterday without changing the existing array', () => {
    const existing: CampusEvent[] = []
    const result = createEvent(existing, { ...draft, date: '2026-10-27' }, 'old', localNow)
    expect(result.error).toMatch(/past/i)
    expect(result.events).toBe(existing)
  })

  it('rejects a same-day event that has already started', () => {
    const result = createEvent([], { ...draft, date: '2026-10-28', start: '09:00', end: '10:00' }, 'today', localNow)
    expect(result.error).toMatch(/already started/i)
    expect(result.events).toEqual([])
  })

  it('accepts a same-day start at the current minute and one later in the day', () => {
    expect(createEvent([], { ...draft, date: '2026-10-28', start: '20:58', end: '21:59' }, 'now', localNow).error).toBeNull()
    expect(createEvent([], { ...draft, date: '2026-10-28', start: '21:00', end: '22:00' }, 'later', localNow).error).toBeNull()
  })

  it('accepts a future day and rejects an impossible date', () => {
    expect(createEvent([], { ...draft, date: '2026-11-01' }, 'future', localNow).error).toBeNull()
    expect(createEvent([], { ...draft, date: '2026-02-30' }, 'bad', localNow).error).toMatch(/valid event date/i)
  })

  it('uses the local date instead of a UTC conversion', () => {
    const localNearMidnight = new Date(2026, 9, 28, 23, 50)
    expect(todayLocal(localNearMidnight)).toBe('2026-10-28')
    expect(todayLocal(new Date(2026, 9, 29, 0, 5))).toBe('2026-10-29')
  })
})

describe('M1 professor feedback: descriptive event records', () => {
  it('trims, stores, and restores the submitted description', () => {
    const created = createEvent([], draft, 'choir-1', localNow)
    expect(created.error).toBeNull()
    expect(created.events).toEqual([
      {
        id: 'choir-1', title: 'Campus Choir',
        description: 'Learn new arrangements with friends.',
        location: 'Music Hall', date: '2026-10-29',
        start: '14:30', end: '15:30',
      },
    ])
    const saved = new Map<string, string>()
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, value) },
    }
    expect(persistEvents(storage, created.events)).toBe(true)
    expect(saved.get(STORAGE_KEY)).toContain('Learn new arrangements')
    expect(loadEvents(storage)).toEqual(created.events)
    expect(removeEvent(loadEvents(storage), 'choir-1')).toEqual([])
  })

  it('supports older M1 events without descriptions', () => {
    const { description: _unused, ...olderDraft } = draft
    const created = createEvent([], olderDraft, 'legacy-1', localNow)
    expect(created.error).toBeNull()
    expect(created.events[0]).not.toHaveProperty('description')
    // The model's existing stored-event guard must still accept old browser data.
    const storage = { getItem: () => JSON.stringify(created.events) }
    expect(loadEvents(storage)).toEqual(created.events)
  })

  it('rejects descriptions beyond the maximum and permits an empty optional description', () => {
    expect(createEvent([], { ...draft, description: 'x'.repeat(501) }, 'long', localNow).error)
      .toMatch(/500 characters/)
    expect(createEvent([], { ...draft, description: '  ' }, 'empty', localNow).events[0])
      .not.toHaveProperty('description')
  })
})

describe('M1 professor feedback: consistent visible dates and times', () => {
  it('uses US calendar dates and 12-hour clocks through the Controller', () => {
    expect(displayDate('2026-10-27')).toBe('10/27/2026')
    expect(displayDate('2026-01-05')).toBe('1/5/2026')
    expect(displayTime('14:30')).toBe('2:30pm')
    expect(displayTime('09:05')).toBe('9:05am')
    expect(displayTime('00:00')).toBe('12:00am')
    expect(displayTime('12:00')).toBe('12:00pm')
    expect(displayTime('23:59')).toBe('11:59pm')
  })
})

describe('Default event form time window', () => {
  it('chooses a future start time in daytime and tomorrow if too close to midnight', () => {
    expect(initialEventWindow(new Date(2026, 9, 28, 11, 10))).toEqual({
      date: '2026-10-28', start: '11:45', end: '12:45',
    })
    expect(initialEventWindow(new Date(2026, 9, 28, 23, 40))).toEqual({
      date: '2026-10-29', start: '14:30', end: '15:30',
    })
  })
})

describe('M1 persistence robustness and input limits', () => {
  it('does not overwrite a corrupted stored value on read', () => {
    let raw = '{bad json'
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } }
    const status = loadEventsChecked(storage)
    expect(status.blocked).toBe(true)
    expect(status.events).toEqual([])
    expect(raw).toBe('{bad json')
  })

  it('recovers valid records but flags duplicate IDs for explicit user approval', () => {
    const existing = createEvent([], { ...draft, date: '2026-11-02' }, 'one', localNow).events[0]
    const storage = { getItem: () => JSON.stringify([existing, existing, null]) }
    const status = loadEventsChecked(storage)
    expect(status.blocked).toBe(true)
    expect(status.events).toEqual([existing])
  })

  it('enforces length limits in the controller, not only in HTML', () => {
    expect(createEvent([], { ...draft, title: 'a'.repeat(101) }, 'long-title', localNow).error).toMatch(/100/)
    expect(createEvent([], { ...draft, location: 'x'.repeat(101) }, 'long-location', localNow).error).toMatch(/100/)
  })

  it('removal can be restored at the original list position', () => {
    const list = [
      createEvent([], { ...draft, date: '2026-11-02' }, 'a', localNow).events[0],
      createEvent([], { ...draft, date: '2026-11-02' }, 'b', localNow).events[0],
    ]
    const receipt = removeEventWithReceipt(list, 'a')
    expect(receipt.events.map(e => e.id)).toEqual(['b'])
    expect(receipt.removed).not.toBeNull()
    expect(restoreRemovedEvent(receipt.events, receipt.removed!).map(e => e.id)).toEqual(['a', 'b'])
    expect(restoreRemovedEvent(list, receipt.removed!)).toEqual(list)
  })
})
