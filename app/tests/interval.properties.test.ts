import { describe, expect, it } from 'vitest'
import { fitsFully, type CampusEvent } from '../src/model/events'
import { overlapSpan } from '../src/model/eventTiming'

// Reproducible pseudo-random case generation. Fixed seeds give reliable CI
// failures with exact iteration values; this is property-style testing, not
// an integration with the fast-check shrinker or a full mutation-test runner.
function random(seed: number) {
  let state = seed >>> 0
  return (max: number) => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state % max
  }
}
const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const base: CampusEvent = {
  id: 'a',
  title: 'Workshop',
  location: 'Library',
  date: '2030-11-07',
  start: '10:00',
  end: '11:00',
}

describe('deterministic interval properties and mutation-sensitive boundaries', () => {
  it('matches an independently calculated oracle for 500 valid intervals', () => {
    const next = random(0x5eed187)
    for (let i = 0; i < 500; i++) {
      const freeStart = next(1438)
      const freeEnd = freeStart + 1 + next(1439 - freeStart)
      const eventStart = next(1438)
      const eventEnd = eventStart + 1 + next(1439 - eventStart)
      const event = { ...base, start: hhmm(eventStart), end: hhmm(eventEnd) }
      const expected = eventStart >= freeStart && eventEnd <= freeEnd
      expect(
        fitsFully(event, base.date, hhmm(freeStart), hhmm(freeEnd)),
        `seed 0x5eed187 case ${i}: free [${freeStart},${freeEnd}] event [${eventStart},${eventEnd}]`,
      ).toBe(expected)
    }
  })

  it('expanding a valid availability window cannot exclude a fitting event', () => {
    const next = random(0xc0ffee)
    for (let i = 0; i < 300; i++) {
      const eventStart = 1 + next(1378),
        eventEnd = eventStart + 1 + next(1439 - eventStart)
      const before = next(eventStart + 1),
        after = eventEnd + next(1440 - eventEnd)
      const event = { ...base, start: hhmm(eventStart), end: hhmm(eventEnd) }
      expect(fitsFully(event, base.date, event.start, event.end)).toBe(true)
      expect(fitsFully(event, base.date, hhmm(before), hhmm(after))).toBe(true)
    }
  })

  it('exact boundary inclusion kills strict-inequality mutations; touching events do not overlap', () => {
    const event = { ...base, start: '14:00', end: '15:00' }
    expect(fitsFully(event, base.date, '14:00', '15:00')).toBe(true)
    expect(fitsFully(event, base.date, '14:01', '15:00')).toBe(false)
    expect(fitsFully(event, base.date, '14:00', '14:59')).toBe(false)
    expect(overlapSpan(event, { ...event, id: 'b', start: '15:00', end: '16:00' })).toBeNull()
    expect(overlapSpan(event, { ...event, id: 'b', start: '14:59', end: '16:00' })).toEqual({
      from: 899,
      to: 900,
    })
  })
})
