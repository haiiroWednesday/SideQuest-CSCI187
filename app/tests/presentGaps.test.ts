import { describe, expect, it } from 'vitest'
import { gapsForParts, pickedBand, presentGaps } from '../src/controller/presentGaps'
import type { LegacyCampusEvent } from '../src/model/events'

// 10:40 on Tuesday 24 November 2026 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const ev = (id: string, start: string, end: string, date = '2026-11-24') =>
  ({ id, date, start, end, title: id, host: 'Host', location: 'Library', description: '' }) as unknown as LegacyCampusEvent

const events = [ev('a', '11:00', '12:00'), ev('b', '13:00', '18:00'), ev('c', '21:00', '22:00'), ev('elsewhere', '15:00', '16:00', '2026-11-25')]

describe('presentGaps', () => {
  const model = presentGaps({ events, plannedIds: ['a', 'b', 'c', 'elsewhere'], now: NOW })

  it('finds the free stretches between planned events, starting from now', () => {
    expect(model.date).toBe('2026-11-24')
    expect(model.gaps.map(g => [g.start, g.end])).toEqual([['12:00', '13:00'], ['18:00', '21:00'], ['22:00', '23:00']])
  })

  it('ignores plans on other days and stretches shorter than 45 minutes', () => {
    const short = presentGaps({ events: [ev('x', '11:00', '12:00'), ev('y', '12:30', '23:00')], plannedIds: ['x', 'y'], now: NOW })
    expect(short.gaps).toEqual([])
  })

  it('sorts gaps into parts of the day', () => {
    expect(gapsForParts(model, ['afternoon']).map(g => g.start)).toEqual(['12:00'])
    expect(gapsForParts(model, ['tonight']).map(g => g.start)).toEqual(['18:00', '22:00'])
  })

  it('places gaps on the ruler in order without overlapping', () => {
    for (let i = 1; i < model.gaps.length; i++) expect(model.gaps[i].left).toBeGreaterThanOrEqual(model.gaps[i - 1].left + model.gaps[i - 1].width)
  })
})

describe('pickedBand', () => {
  const model = presentGaps({ events, plannedIds: ['a'], now: NOW })

  it('draws a picked window on today’s ruler with a short label', () => {
    const band = pickedBand(model, { date: '2026-11-24', start: '18:30', end: '21:00' })
    expect(band?.label).toBe('6:30–9')
    expect(band!.width).toBeGreaterThan(0)
  })

  it('draws nothing for another day, an incomplete window or a backwards one', () => {
    expect(pickedBand(model, { date: '2026-11-25', start: '18:30', end: '21:00' })).toBeNull()
    expect(pickedBand(model, { date: '2026-11-24', start: '18:30', end: '' })).toBeNull()
    expect(pickedBand(model, { date: '2026-11-24', start: '21:00', end: '18:30' })).toBeNull()
  })

  it('clips a window to the hours the ruler shows', () => {
    const band = pickedBand(model, { date: '2026-11-24', start: '06:00', end: '09:00' })
    expect(band?.left).toBe(0)
    expect(band?.label).toBe('8–9')
  })
})
