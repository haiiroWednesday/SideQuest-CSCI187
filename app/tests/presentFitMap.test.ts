import { describe, expect, it } from 'vitest'
import { presentFitMap } from '../src/controller/presentMap'

const ev = (id: string, fit: 'fits' | 'outside' | null, planned = false) => ({
  id, title: `Event ${id}`, location: 'Benson Memorial Center', dow: 'THU', dayNumber: 26,
  start: { time: '6', ampm: 'pm' }, endText: '7pm', planned, fit,
})

describe("presentFitMap (Discover's map mode)", () => {
  it('sends only the events that fit, never those outside your free time', () => {
    const rows = presentFitMap([{ date: '2026-11-26', isToday: false, events: [ev('a', 'fits'), ev('b', 'outside'), ev('c', 'fits', true)] }])
    expect(rows.map(r => r.id)).toEqual(['a', 'c'])
    expect(rows[1].planned).toBe(true)
    expect(rows.every(r => r.posted === false)).toBe(true)
  })
  it('sends every listed event while no free time is set', () => {
    expect(presentFitMap([{ date: '2026-11-26', isToday: false, events: [ev('a', null), ev('b', null)] }])).toHaveLength(2)
  })
  it('labels markers with the time today and the weekday later', () => {
    const [today] = presentFitMap([{ date: '2026-11-24', isToday: true, events: [ev('a', null)] }])
    const [later] = presentFitMap([{ date: '2026-11-26', isToday: false, events: [ev('a', null)] }])
    expect(today.short).toBe('6pm')
    expect(today.when).toBe('Today · 6pm–7pm')
    expect(later.short).toBe('Thu 6pm')
    expect(later.when).toBe('Thu 26 · 6pm–7pm')
  })
})
