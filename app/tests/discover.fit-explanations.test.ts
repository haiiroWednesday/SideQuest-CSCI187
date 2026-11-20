import { describe, expect, it } from 'vitest'
import { presentDiscover } from '../src/controller/presentDiscover'
import type { ScreenEvent } from '../src/controller/screenModels'

const day = '2030-11-07'
const event = (id: string, title: string, start: string, end: string): ScreenEvent => ({
  id, title, start, end, date: day, location: 'Santa Clara University',
})

describe('Discover presents explanations separately from strict results', () => {
  it('keeps one fully fitting event and reports a different same-day event as a partial overlap', () => {
    const screen = presentDiscover({
      events: [
        event('full', 'Fully fitting', '14:30', '15:30'),
        event('late', 'Runs too late', '14:30', '16:15'),
        event('outside', 'No overlap', '16:15', '17:15'),
        { ...event('tomorrow', 'Other date', '14:30', '15:30'), date: '2030-11-08' },
      ],
      freeWindow: { date: day, start: '14:30', end: '15:30' },
      now: new Date('2030-11-07T17:00:00Z'),
    })
    expect(screen.freeWindow?.fitCount).toBe(1)
    expect(screen.count).toBe(1)
    expect(screen.days.flatMap(d => d.events.map(e => e.id))).toEqual(['full'])
    expect(screen.nearMisses.map(e => [e.id, e.kind])).toEqual([
      ['late', 'overlap'], ['outside', 'outside'],
    ])
    expect(screen.nearMisses[0].reason).toContain('ends 45 minutes after')
  })

  it('does not label invalid search windows or unfiltered results as near misses', () => {
    const screen = presentDiscover({
      events: [event('one', 'One', '14:30', '15:30')],
      freeWindow: { date: day, start: '16:00', end: '15:00' },
      now: new Date('2030-11-07T17:00:00Z'),
    })
    expect(screen.freeWindow?.error).toBeTruthy()
    expect(screen.nearMisses).toEqual([])
    expect(screen.count).toBe(1)
  })
})
