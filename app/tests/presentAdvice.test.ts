import { describe, expect, it } from 'vitest'
import { presentDiscover } from '../src/controller/presentDiscover'
import { presentFoodNotices, presentLeaveNotes, presentStretchAdvice } from '../src/controller/presentAdvice'
import { toStub, type ScreenEvent } from '../src/controller/screenModels'

const D = '2026-11-24'
// 10:40 in Santa Clara (PST)
const NOW = new Date(Date.UTC(2026, 10, 24, 18, 40))
const ev = (id: string, title: string, location: string, start: string, end: string, extra: Partial<ScreenEvent> = {}): ScreenEvent =>
  ({ id, title, hostName: 'Host', description: '', location, date: D, start, end, ...extra })

describe('tags are set by people, never guessed from words', () => {
  const events = [
    ev('a', 'Free pizza lunch with a guest speaker', 'Benson', '12:00', '13:00'),
    ev('b', 'Study group', 'Library', '13:00', '14:00', { tags: ['free-food'], tagsBy: 'host' }),
  ]
  it('filters on the tags the host set, ignoring the title', () => {
    const screen = presentDiscover({ events, tags: ['free-food'], now: NOW })
    expect(screen.days.flatMap(d => d.events.map(e => e.id))).toEqual(['b'])
    expect(screen.tagFilters?.options.find(o => o.id === 'free-food')?.count).toBe(1)
    expect(screen.tagFilters?.options.find(o => o.id === 'guest-speaker')?.count).toBe(0)
  })
  it('says who set the tags, and where the event came from', () => {
    const planned = new Set<string>()
    expect(toStub(events[1], NOW, planned, null)).toMatchObject({ tagLabels: ['Free food'], tagSourceText: 'set by the host', sourceText: 'Posted by the host' })
    const imported = ev('c', 'Panel', 'Lucas Hall', '15:00', '16:00', { tags: ['guest-speaker'], tagsBy: 'reviewer', source: 'scu-calendar' })
    expect(toStub(imported, NOW, planned, null)).toMatchObject({ tagSourceText: 'checked by a reviewer', sourceText: "From SCU's events calendar, checked" })
    expect(toStub(events[0], NOW, planned, null)).not.toHaveProperty('tagLabels')
  })
})

describe('stretch advice', () => {
  const lunch = ev('p', 'Lunch talk', 'Kenna Hall', '11:00', '12:00')
  const events = [lunch,
    ev('a', 'Glean Team', 'Forge Garden', '12:00', '13:00'),
    ev('b', 'Ethics panel', 'Lucas Hall', '13:30', '14:30'),
    ev('x', 'Too long', 'Benson', '16:00', '18:00')]
  it('gives one pick and a plan for a free stretch, from fitting events only', () => {
    const [advice] = presentStretchAdvice({ events, windows: [{ date: D, start: '12:00', end: '17:00', label: '12–5pm' }], plannedIds: ['p'], now: NOW })
    expect(advice.count).toBe(2)
    expect(advice.pick.id).toBe('b')
    expect(advice.pick.reason).toMatch(/Lunch talk/)
    expect(advice.plan?.ids).toEqual(['a', 'b'])
    expect(advice.plan?.stops[1].walk).toMatch(/min walk/)
  })
  it('says nothing for a stretch nothing fits', () => {
    expect(presentStretchAdvice({ events, windows: [{ date: D, start: '19:00', end: '20:00', label: '7–8pm' }], plannedIds: [], now: NOW })).toEqual([])
  })
  it('puts a warning before a leave-by on fitting cards, and skips planned ones', () => {
    const dinner = ev('d', 'Dinner', 'Benson', '17:00', '18:00')
    const nourish = ev('n', 'Nourish Nights', 'Forge Garden', '18:00', '19:00')
    const notes = presentLeaveNotes({ events: [dinner, nourish], fittingIds: ['n', 'd'], plannedIds: ['d'] })
    expect(notes.get('n')).toMatchObject({ warn: true })
    expect(notes.has('d')).toBe(false)
  })
})

describe('food notices on Discover', () => {
  const live = ev('s', 'Study Jam', 'Library', '10:00', '12:00')
  const later = ev('l', 'Later thing', 'Benson', '15:00', '16:00')
  const at = NOW.getTime()
  it('shows unexpired notices for events happening now, with minutes left', () => {
    const models = presentFoodNotices({ events: [live, later], now: NOW, notices: [
      { eventId: 's', postedAt: at - 6 * 60_000, expiresAt: at + 24 * 60_000 },
      { eventId: 'l', postedAt: at - 60_000, expiresAt: at + 29 * 60_000 },
      { eventId: 's', postedAt: at - 40 * 60_000, expiresAt: at - 10 * 60_000 },
    ] })
    expect(models).toEqual([{ eventId: 's', title: 'Study Jam', location: 'Library', minutesLeft: 24 }])
  })
})
