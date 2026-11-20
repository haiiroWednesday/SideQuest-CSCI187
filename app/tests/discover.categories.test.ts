import { describe, expect, it } from 'vitest'
import { presentDiscover } from '../src/controller/presentDiscover'
import type { ScreenEvent } from '../src/controller/screenModels'

const date = '2030-11-07'
const event = (id: string, title: string, start: string, end: string): ScreenEvent => ({
  id, title, date, start, end, hostName: 'Campus Organization', location: 'Benson',
})
const upcoming = [
  event('arts-fit', 'Jazz performance', '14:30', '15:30'),
  event('arts-overlap', 'Film screening', '14:30', '16:00'),
  event('sports', 'Basketball match', '14:30', '15:30'),
  event('other', 'Student gathering', '16:00', '17:00'),
]
const now = new Date('2030-11-07T17:00:00Z')

describe('Suggested Discover categories and strict free-time intersection', () => {
  it('counts all upcoming records using a conservative seven-category taxonomy', () => {
    const all = presentDiscover({ events: upcoming, now })
    expect(all.count).toBe(4)
    expect(all.categories.selected).toBe('all')
    expect(all.categories.options.find(item => item.id === 'arts')?.count).toBe(2)
    expect(all.categories.options.find(item => item.id === 'sports')?.count).toBe(1)
    expect(all.categories.options.find(item => item.id === 'other')?.count).toBe(1)
  })

  it('filters same-day strict fits and nonfitting explanations to the selected category', () => {
    const result = presentDiscover({
      events: upcoming, category: 'arts', now,
      freeWindow: { date, start: '14:30', end: '15:30' },
    })
    expect(result.freeWindow?.fitCount).toBe(1)
    expect(result.days.flatMap(day => day.events.map(item => item.id))).toEqual(['arts-fit'])
    expect(result.nearMisses.map(item => item.id)).toEqual(['arts-overlap'])
    expect(result.nearMisses[0]?.reason).toContain('ends 30 minutes after')
    expect(result.categories.selected).toBe('arts')
    expect(result.categories.options.find(item => item.id === 'all')?.count).toBe(4)
  })

  it('displays the empty category truthfully and allows recovery', () => {
    const screen = presentDiscover({ events: upcoming, now, category: 'wellness' })
    expect(screen.count).toBe(0)
    expect(screen.status).toBe('ready')
    expect(screen.days).toEqual([])
    expect(screen.categories.options.find(item => item.id === 'wellness')?.count).toBe(0)
  })
})
