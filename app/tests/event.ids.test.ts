// Test owner: Sembiyan Arunkumar (AI-assisted draft).
// Checks that empty and duplicate IDs are rejected without
// changing existing events, while a new ID succeeds.

import { expect, it } from 'vitest'
import { createEvent } from '../src/controller/findEvents'
import type { EventDraft } from '../src/model/events'

// 🔑 Fix the clock to October 1: an ID test must never pass just because
// its October 26 event happens to be in the past on the day CI runs.
const draft: EventDraft = {
  title: 'Speaker Event',
  location: 'Library',
  date: '2026-10-26',
  start: '14:00',
  end: '15:00',
}

it('rejects an empty event ID', () => {
  const events = [{ ...draft, id: 'event-1' }]

  const result = createEvent(events, draft, '', new Date(2026, 9, 1))

  expect(result.error).toMatch(/unique event/i)

  expect(result.events).toEqual([
    { ...draft, id: 'event-1' },
  ])

  expect(events).toEqual([
    { ...draft, id: 'event-1' },
  ])
})

// 🔑 IDs, unlike event titles, must be unique. A specific ID error matters
// here: checking for any error could hide another validation problem.
it('rejects an ID that another event already uses', () => {
  const events = [{ ...draft, id: 'event-1' }]

  const differentEvent = {
    ...draft,
    title: 'Art Workshop',
  }

  const result = createEvent(events, differentEvent, 'event-1', new Date(2026, 9, 1))

  expect(result.error).toMatch(/unique event/i)

  expect(result.events).toEqual([
    { ...draft, id: 'event-1' },
  ])

  expect(events).toEqual([
    { ...draft, id: 'event-1' },
  ])
})

it('allows the same title when the event IDs are different', () => {
  const events = [{ ...draft, id: 'event-1' }]

  const result = createEvent(events, draft, 'event-2', new Date(2026, 9, 1))

  expect(result.error).toBeNull()

  expect(result.events).toEqual([
    { ...draft, id: 'event-1' },
    { ...draft, id: 'event-2' },
  ])

  expect(events).toEqual([
    { ...draft, id: 'event-1' },
  ])
})