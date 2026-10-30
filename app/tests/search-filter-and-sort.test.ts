// Author: Cynthia
// Tests that searches exclude nonmatching events and sort results by start time.
import { expect, it } from 'vitest'
import { findEvents } from '../src/controller/findEvents'
import type { CampusEvent } from '../src/model/events'

// 🔎 The list intentionally starts out unsorted and includes events on
// the wrong date and outside the time window. Correct search must FILTER
// the wrong ones out and SORT the remaining matches by start time.
it('filters a shuffled event list and returns matching events in chronological order', () => {
  const events: CampusEvent[] = [
    {
      id: 'choir', title: 'Choir Practice', location: 'Music Hall',
      date: '2026-10-26', start: '16:00', end: '16:30',
    },
    {
      id: 'painting', title: 'Painting Workshop', location: 'Arts Building',
      date: '2026-10-27', start: '14:30', end: '15:30',
    },
    {
      id: 'gaming', title: 'Gaming Club', location: 'Student Center',
      date: '2026-10-26', start: '16:30', end: '17:30',
    },
    {
      id: 'art', title: 'Art Club', location: 'Arts Building',
      date: '2026-10-26', start: '14:30', end: '15:30',
    },
  ]

  // We are free on October 26 from 2:00 PM to 5:00 PM.
  const result = findEvents(events, '2026-10-26', '14:00', '17:00')

  // The search itself was valid.
  expect(result.error).toBeNull()

  // Painting is on the wrong day; Gaming ends 30 minutes too late.
  expect(result.matches).toHaveLength(2)

  // The input was shuffled (Choir came first), so this also checks sorting.
  expect(result.matches.map(event => event.id)).toEqual(['art', 'choir'])
})
