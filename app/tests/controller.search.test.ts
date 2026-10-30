// Shared controller regression tests (AI-assisted starter examples).
import { describe, expect, it } from 'vitest'
import { createEvent, findEvents } from '../src/controller/findEvents'
import type { EventDraft } from '../src/model/events'

// This draft includes extra spaces on purpose. Creation should trim its
// title and location rather than saving the accidental whitespace.
const draft: EventDraft = {
  title: ' Art Workshop ', location: ' Arts Building ', date: '2026-10-19',
  start: '14:30', end: '15:30',
}

describe('Controller: event creation → search', () => {
  it('starts with no events; creates one; then finds the newly created event', () => {
    expect(findEvents([], '2026-10-19', '14:00', '16:00').matches).toEqual([])
    const created = createEvent([], draft, 'art-1', new Date(2026, 9, 1))
    expect(created.error).toBeNull()
    expect(created.events[0].title).toBe('Art Workshop')
    expect(findEvents(created.events, '2026-10-19', '14:00', '16:00').matches.map((event) => event.id))
      .toEqual(['art-1'])
  })
  // ⛔ The end must be after the start. A rejected request must leave
  // the list unchanged instead of inserting a broken event.
  it('rejects an event with reversed times without adding it', () => {
    const created = createEvent([], { ...draft, start: '17:00', end: '16:00' }, 'broken', new Date(2026, 9, 1))
    expect(created.error).not.toBeNull()
    expect(created.events).toEqual([])
  })
  it('rejects a missing event title or location', () => {
    expect(createEvent([], { ...draft, title: '  ' }, 'invalid', new Date(2026, 9, 1)).error).not.toBeNull()
    expect(createEvent([], { ...draft, location: '' }, 'invalid', new Date(2026, 9, 1)).error).not.toBeNull()
  })
  it('does not show events on a different date', () => {
    const created = createEvent([], draft, 'art-1', new Date(2026, 9, 1))
    expect(findEvents(created.events, '2026-10-20', '14:00', '16:00').matches).toEqual([])
  })
  it('rejects an invalid search interval', () => {
    const result = findEvents([], '2026-10-19', '16:00', '14:00')
    expect(result.error).not.toBeNull()
    expect(result.matches).toEqual([])
  })
})
