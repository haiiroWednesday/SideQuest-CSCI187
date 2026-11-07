// Regression coverage: reusable domain rules stay in the Model.
import { describe, expect, it } from 'vitest'
import {
  validateEventDraft, validateSearchWindow, matchingEvents, removeEventFromList,
  restoreEventInList, isPastEventDate, isCampusEvent, readStoredEventsChecked,
  type CampusEvent, type EventDraft,
} from '../src/model/events'

// Use a fixed clock so past/future checks work consistently next month.
// The JavaScript Date constructor starts month numbering at zero.
const now = new Date(2026, 9, 29, 13, 30)
const draft: EventDraft = {
  title: ' Art Workshop ', description: '  Paint with friends  ',
  location: ' Arts Building ', date: '2026-10-30', start: '14:30', end: '15:30',
}

// Create valid test data through the real Model function. If the setup
// itself is invalid, fail rather than accidentally testing a bad fixture.
function created(id: string, values: EventDraft = draft): CampusEvent {
  const result = validateEventDraft(values, id, [], now)
  if (!result.event) throw new Error(result.error ?? 'Unexpected invalid fixture')
  return result.event
}

describe('Model event creation business rules', () => {
  it('normalizes the event and description without needing a React view', () => {
    expect(validateEventDraft(draft, 'art-1', [], now)).toEqual({
      event: {
        id: 'art-1', title: 'Art Workshop', description: 'Paint with friends',
        location: 'Arts Building', date: '2026-10-30', start: '14:30', end: '15:30',
      },
      error: null,
    })
  })

  it('rejects past dates and already-started same-day events', () => {
    expect(validateEventDraft({ ...draft, date: '2026-10-28' }, 'past', [], now).error)
      .toMatch(/past/i)
    expect(validateEventDraft({ ...draft, date: '2026-10-29', start: '12:00', end: '14:00' }, 'earlier', [], now).error)
      .toMatch(/already started/i)
    expect(validateEventDraft({ ...draft, date: '2026-10-29', start: '13:30', end: '15:00' }, 'current', [], now).error)
      .toBeNull()
  })

  it('rejects invalid data and non-unique IDs at the Model boundary', () => {
    expect(validateEventDraft({ ...draft, title: ' ' }, 'empty', [], now).error).toMatch(/title/i)
    expect(validateEventDraft({ ...draft, start: '16:00', end: '15:00' }, 'wrong', [], now).error).toMatch(/later/i)
    expect(validateEventDraft({ ...draft, description: 'x'.repeat(501) }, 'long', [], now).error).toMatch(/500/i)
    expect(validateEventDraft(draft, 'art-1', [created('art-1')], now).error).toMatch(/unique/i)
    expect(validateEventDraft(draft, '   ', [], now).error).toMatch(/unique/i)
  })
})

describe('Model search and list rules', () => {
  it('validates search windows independent of the Controller', () => {
    expect(validateSearchWindow({ date: '', start: '14:00', end: '16:00' })).toMatch(/valid date/i)
    expect(validateSearchWindow({ date: '2026-10-30', start: '16:00', end: '14:00' })).toMatch(/later/i)
    expect(validateSearchWindow({ date: '2026-10-30', start: '14:00', end: '16:00' })).toBeNull()
  })

  it('filters to full-fit events with inclusive boundaries and sorts them', () => {
    const events = [
      created('late', { ...draft, start: '15:00', end: '16:00' }),
      created('early', { ...draft, start: '14:00', end: '15:00' }),
      created('too-late', { ...draft, start: '16:00', end: '17:00' }),
    ]
    const found = matchingEvents(events, { date: '2026-10-30', start: '14:00', end: '16:00' })
    expect(found.map(e => e.id)).toEqual(['early', 'late'])
    expect(events.map(e => e.id)).toEqual(['late', 'early', 'too-late'])
  })

  it('removes and restores the correct record without altering other events', () => {
    const events = [created('first'), created('second')]
    const { events: remaining, removed } = removeEventFromList(events, 'first')
    expect(remaining.map(e => e.id)).toEqual(['second'])
    expect(removed).not.toBeNull()
    expect(restoreEventInList(remaining, removed!)).toEqual(events)
  })

  it('distinguishes already-ended saved events from future events', () => {
    expect(isPastEventDate({ ...created('past'), date: '2026-10-29', start: '09:00', end: '12:00' }, now)).toBe(true)
    expect(isPastEventDate(created('future'), now)).toBe(false)
    expect(isPastEventDate({ ...created('ending-now'), date: '2026-10-29', end: '13:30' }, now)).toBe(true)
  })
})

describe('Saved-event boundary validation', () => {
  it('rejects long titles/locations and whitespace-only IDs in restored JSON', () => {
    const valid = created('good')
    const invalidTitle = { ...valid, id: 'long-title', title: 'x'.repeat(101) }
    const invalidLocation = { ...valid, id: 'long-place', location: 'y'.repeat(101) }
    const invalidId = { ...valid, id: '   ' }
    expect(isCampusEvent(invalidTitle)).toBe(false)
    expect(isCampusEvent(invalidLocation)).toBe(false)
    expect(isCampusEvent(invalidId)).toBe(false)

    const storage = { getItem: () => JSON.stringify([valid, invalidTitle, invalidLocation, invalidId]) }
    expect(readStoredEventsChecked(storage)).toEqual({ events: [valid], blocked: true })
  })
})
