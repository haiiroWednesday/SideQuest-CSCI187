// Shared model regression tests.
import { describe, expect, it } from 'vitest'
import { fitsFully, isValidDate, toMinutes, type CampusEvent } from '../src/model/events'

const event: CampusEvent = {
  id: 'art-1', title: 'Art Workshop', location: 'Arts Building',
  date: '2026-10-19', start: '14:30', end: '15:30',
}

describe('Model: time and calendar matching', () => {
  it('includes an event that fits the same date and time window', () => {
    expect(fitsFully(event, '2026-10-19', '14:00', '16:00')).toBe(true)
  })
  it('rejects an event ending after the available window', () => {
    expect(fitsFully(event, '2026-10-19', '14:00', '15:00')).toBe(false)
  })
  it('rejects an event on a different day even when its times fit', () => {
    expect(fitsFully(event, '2026-10-20', '14:00', '16:00')).toBe(false)
  })
  // Starting exactly when free time begins and ending exactly when it
  // ends is allowed; the interval boundaries are inclusive.
  it('accepts an event exactly matching the window', () => {
    expect(fitsFully(event, '2026-10-19', '14:30', '15:30')).toBe(true)
  })
  it('validates clock times and real calendar dates', () => {
    expect(toMinutes('14:30')).toBe(870)
    expect(toMinutes('25:80')).toBeNull()
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2028-02-29')).toBe(true)
  })
})
