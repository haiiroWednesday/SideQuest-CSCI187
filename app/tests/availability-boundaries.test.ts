// Test owner: Cynthia (AI-assisted draft, scenarios chosen and checked for M1).
// Category #5 — Boundary times: an event must fit ENTIRELY within the free window.
import { expect, it } from 'vitest'
import { fitsFully, type CampusEvent } from '../src/model/events'

it('accepts an exact end boundary but rejects an event one minute outside free time', () => {
  const event: CampusEvent = {
    id: 'workshop',
    title: 'Creative Workshop',
    location: 'Arts Building',
    date: '2026-10-26',
    start: '14:30',
    end: '17:00',
  }

  // Free from 2:00 PM to 5:00 PM: an event ending AT 5:00 PM fits.
  expect(fitsFully(event, '2026-10-26', '14:00', '17:00')).toBe(true)

  // Ending at 5:01 PM is outside our available time.
  const lateEvent = { ...event, end: '17:01' }
  expect(fitsFully(lateEvent, '2026-10-26', '14:00', '17:00')).toBe(false)

  // Starting at 1:59 PM is also outside our available time.
  const earlyEvent = { ...event, start: '13:59' }
  expect(fitsFully(earlyEvent, '2026-10-26', '14:00', '17:00')).toBe(false)
})
