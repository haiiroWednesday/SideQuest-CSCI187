// Test owner: Sembiyan Arunkumar (AI-assisted draft).
// Checks that empty and duplicate IDs are rejected without
// changing existing events, while a new ID succeeds.

import { expect, it } from 'vitest'
import { createEvent } from '../src/controller/findEvents'
import type { EventDraft } from '../src/model/events'

const draft: EventDraft = {
  title: 'Speaker Event',
  location: 'Library',
  date: '2026-10-26',
  start: '14:00',
  end: '15:00',
}

it('rejects an empty event ID', () => {
  const events = [{ ...draft, id: 'event-1' }]

  const result = createEvent(events, draft, '')

  expect(result.error).not.toBeNull()

  expect(result.events).toEqual([
    { ...draft, id: 'event-1' },
  ])

  expect(events).toEqual([
    { ...draft, id: 'event-1' },
  ])
})

it('rejects an ID that another event already uses', () => {
  const events = [{ ...draft, id: 'event-1' }]

  const differentEvent = {
    ...draft,
    title: 'Art Workshop',
  }

  const result = createEvent(events, differentEvent, 'event-1')

  expect(result.error).not.toBeNull()

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