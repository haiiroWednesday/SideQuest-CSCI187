// Example model tests. Replace this comment with the student responsible.
// Every teammate needs an additional DISTINCT test for M1.
import { describe, expect, it } from 'vitest'
import { fitsFully, toMinutes, type CampusEvent } from '../src/model/events'

const event: CampusEvent = {
  id: 'art', title: 'Art Workshop', category: 'Creative',
  location: 'Arts Building', start: '14:30', end: '15:30',
}

describe('Model: full attendance matching', () => {
  it('includes an event that fits', () => {
    expect(fitsFully(event, '14:00', '16:00')).toBe(true)
  })
  it('rejects an event ending too late', () => {
    expect(fitsFully(event, '14:00', '15:00')).toBe(false)
  })
  it('accepts an event exactly matching the window', () => {
    expect(fitsFully(event, '14:30', '15:30')).toBe(true)
  })
  it('validates time input', () => {
    expect(toMinutes('14:30')).toBe(870)
    expect(toMinutes('25:80')).toBeNull()
  })
})
