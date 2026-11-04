import { describe, expect, it } from 'vitest'
import { campusNow } from '../src/model/eventCatalog'
import { presentDiscover, presentSchedule, describeDay, type ScreenEvent } from '../src/controller/presentScreens'

// Explicit California winter instants, independent of the test runner's zone.
const at = (date: string, time: string) => new Date(`${date}T${time}:00-08:00`)
let n = 0
const ev = (date: string, start: string, end: string, extra: Partial<ScreenEvent> = {}): ScreenEvent => ({
  id: `e${++n}`, title: `Event ${n}`, location: 'Library', date, start, end, ...extra,
})

describe('presentDiscover: the clock decides the labels', () => {
  const events = [
    ev('2026-11-04', '12:30', '13:30', { title: 'Climbing' }),
    ev('2026-11-04', '18:45', '19:45', { title: 'Choir' }),
    ev('2026-11-05', '15:00', '17:00', { title: 'Study Jam' }),
    ev('2026-11-07', '17:00', '18:30', { title: 'Open Studio' }),
    ev('2026-11-13', '10:00', '11:00', { title: 'Nine days out' }),
    ev('2026-12-02', '10:00', '11:00', { title: 'Next month' }),
  ]

  it('labels days relative to today: today, tomorrow, weekday, in N days, then a date', () => {
    const screen = presentDiscover({ events, now: at('2026-11-04', '09:00') })
    expect(screen.days.map(d => d.tag)).toEqual(['TODAY', 'TOMORROW', 'SAT', 'IN 9 DAYS', 'DEC 2'])
    expect(screen.days.map(d => d.monthTag)).toEqual([null, null, null, null, 'DEC'])
    expect(screen.headingText).toBe('Coming up, 6 events')
  })

  it('relabels the same catalog when the clock moves to the next day, and drops what has ended', () => {
    const screen = presentDiscover({ events, now: at('2026-11-05', '16:00') })
    expect(screen.days.map(d => d.tag)).toEqual(['TODAY', 'SAT', 'IN 8 DAYS', 'DEC 2'])
    expect(screen.days[0].events.map(e => e.title)).toEqual(['Study Jam'])
    expect(screen.days[0].events[0].live).toEqual({ kind: 'now', text: 'Happening now · until 5:00pm' })
  })

  it('drops events that ended earlier today, excludes one at its end boundary, and says when one starts soon', () => {
    const today = [
      ev('2026-11-04', '08:00', '09:00', { title: 'Ended' }),
      ev('2026-11-04', '09:00', '12:00', { title: 'Ends now' }),
      ev('2026-11-04', '12:25', '13:00', { title: 'Soon' }),
      ev('2026-11-04', '14:00', '15:00', { title: 'Later' }),
    ]
    const screen = presentDiscover({ events: today, now: at('2026-11-04', '12:00') })
    const stubs = screen.days[0].events
    expect(stubs.map(s => s.title)).toEqual(['Soon', 'Later'])
    expect(stubs.map(s => s.live?.text ?? null)).toEqual(['Starts in 25 min', null])
    expect(presentDiscover({ events: today, now: at('2026-11-04', '23:59') }).status).toBe('empty')
  })

  it('crosses a year: Dec 31 and Jan 1 are today and tomorrow, and January shows its month', () => {
    const screen = presentDiscover({
      events: [ev('2027-01-01', '00:30', '01:30'), ev('2026-12-31', '22:00', '23:30')],
      now: at('2026-12-31', '21:00'),
    })
    expect(screen.days.map(d => [d.tag, d.long, d.monthTag])).toEqual([
      ['TODAY', 'Thursday, 12/31/2026', null],
      ['TOMORROW', 'Friday, 1/1/2027', 'JAN'],
    ])
    expect(screen.days[1].events[0].start).toEqual({ time: '12:30', ampm: 'am' })
  })

  it('sorts whatever order the catalog sends, and keeps duplicate titles apart by ID', () => {
    const a = ev('2026-11-06', '19:00', '20:30', { id: 'b-print', title: 'Open Studio' })
    const b = ev('2026-11-06', '17:00', '18:30', { id: 'a-art', title: 'Open Studio' })
    const screen = presentDiscover({ events: [a, b], now: at('2026-11-04', '09:00') })
    expect(screen.days[0].events.map(e => e.id)).toEqual(['a-art', 'b-print'])
  })

  it('sorts shuffled events chronologically across dates', () => {
    const events = [
      ev('2026-11-08', '09:00', '10:00', { id: 'sunday' }),
      ev('2026-11-05', '19:00', '20:00', { id: 'thursday-evening' }),
      ev('2026-11-06', '12:00', '13:00', { id: 'friday' }),
      ev('2026-11-05', '14:00', '15:00', { id: 'thursday-afternoon' }),
      ev('2026-11-05', '08:00', '09:00', { id: 'thursday-morning' }),
    ]

    const screen = presentDiscover({ events, now: at('2026-11-04', '09:00') })

    expect(screen.days.flatMap(day => day.events.map(event => event.id))).toEqual([
      'thursday-morning',
      'thursday-afternoon',
      'thursday-evening',
      'friday',
      'sunday',
    ])
  })

  it('reports missing host and description as null rather than inventing text', () => {
    const screen = presentDiscover({ events: [ev('2026-11-06', '10:00', '11:15', { hostName: '  ', description: '' })], now: at('2026-11-04', '09:00') })
    const stub = screen.days[0].events[0]
    expect([stub.host, stub.description, stub.durationText]).toEqual([null, null, '1 hr 15 min'])
  })

  it('passes loading and error through, and never shows an empty state for a failed read', () => {
    expect(presentDiscover({ events: [], loading: true }).status).toBe('loading')
    const failed = presentDiscover({ events: [], error: 'Network down' })
    expect([failed.status, failed.errorMessage]).toEqual(['error', 'Network down'])
  })

  it('filters to full fits only once the whole window is set and valid', () => {
    const list = [ev('2026-11-04', '14:30', '15:30', { id: 'in' }), ev('2026-11-04', '15:00', '16:30', { id: 'out' })]
    const now = at('2026-11-04', '09:00')
    const partial = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '14:00', end: '' } })
    expect(partial.freeWindow).toMatchObject({ active: false, fitText: null, error: null, canClear: true })
    expect(partial.days[0].events.map(e => e.fit)).toEqual([null, null])

    const full = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '14:00', end: '16:00' } })
    expect(full.freeWindow).toMatchObject({ active: true, fitCount: 1, fitText: '1 fit' })
    expect(full.days[0].events.map(e => e.fit)).toEqual(['fits'])

    // Inclusive edges: an event that exactly fills the window fits.
    const edge = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '14:30', end: '15:30' } })
    expect(edge.days[0].events[0].fit).toBe('fits')

    const backwards = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '16:00', end: '14:00' } })
    expect(backwards.freeWindow?.error).toBe('Please choose an end time later than your start time.')
    expect(backwards.days[0].events.map(e => e.fit)).toEqual([null, null])

    const none = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-05', start: '09:00', end: '10:00' } })
    expect(none.freeWindow?.fitText).toBe('Nothing fits')
    expect(none.days).toEqual([])
  })

  it('explains every incomplete filter without claiming the results are filtered', () => {
    const now = at('2026-11-04', '09:00')
    const values = { date: '2026-11-04', start: '14:00', end: '16:00' }
    for (let mask = 1; mask < 7; mask++) {
      const freeWindow = { date: mask & 1 ? values.date : '', start: mask & 2 ? values.start : '', end: mask & 4 ? values.end : '' }
      const result = presentDiscover({ events, now, freeWindow })
      expect(result.freeWindow).toMatchObject({ active: false, error: null,
        hint: 'Showing all upcoming events. Complete the date and both times to filter.' })
      expect(result.count).toBe(6)
    }
    expect(presentDiscover({ events, now, freeWindow: { date: '', start: '', end: '' } }).freeWindow?.hint).toBeNull()
    expect(presentDiscover({ events, now, freeWindow: values }).freeWindow?.hint).toBeNull()
  })

  it('keeps every event exactly once, in time order, under the right day, for 300 random catalogs', () => {
    let seed = 7
    const rand = (k: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k }
    for (let run = 0; run < 300; run++) {
      const now = at('2026-11-04', `${String(rand(24)).padStart(2, '0')}:${String(rand(60)).padStart(2, '0')}`)
      const events = Array.from({ length: rand(25) }, () => {
        const day = 1 + rand(40)
        const date = `2026-${day > 30 ? 12 : 11}-${String(day > 30 ? day - 30 : day).padStart(2, '0')}`
        const start = rand(23 * 4) * 15
        const end = Math.min(start + 15 + rand(8) * 15, 23 * 60 + 59)
        const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
        return ev(date, hhmm(start), hhmm(end))
      })
      const screen = presentDiscover({ events, now })
      const shown = screen.days.flatMap(d => d.events)
      const expected = events.filter(e => e.date > '2026-11-04' || (e.date === '2026-11-04' && e.end > campusNow(now).time))
      expect(new Set(shown.map(s => s.id))).toEqual(new Set(expected.map(e => e.id)))
      expect(shown.map(s => s.date + s.id)).toHaveLength(expected.length)
      screen.days.forEach((day, i) => {
        expect(day.events.every(e => e.date === day.date)).toBe(true)
        if (i) expect(day.date > screen.days[i - 1].date).toBe(true)
        expect(day.tag).toBe(describeDay(day.date, now).tag)
      })
      if (screen.days[0]?.date === '2026-11-04') expect(screen.days[0].tag).toBe('TODAY')
    }
  })
})

describe('presentSchedule: Next up, overlaps and missing plans', () => {
  const ceramics = ev('2026-11-07', '14:30', '15:30', { id: 'ceramics', title: 'Ceramics Workshop' })
  const poetry = ev('2026-11-07', '15:00', '16:00', { id: 'poetry', title: 'Poetry Reading' })
  const mic = ev('2026-11-08', '19:00', '21:00', { id: 'mic', title: 'Open Mic Night' })
  const input = {
    ids: ['mic', 'poetry', 'gone-1', 'ceramics'],
    entries: [{ event: mic, conflict: null }, { event: poetry, conflict: ceramics }, { event: ceramics, conflict: poetry }],
    missingIds: ['gone-1'],
  }

  it('counts down to the next plan and words the overlap with its size', () => {
    const screen = presentSchedule(input, at('2026-11-07', '13:00'))
    expect(screen.nextUp).toMatchObject({ kind: 'today', when: 'in 1 hr 30 min' })
    expect(screen.nextUp?.stub.title).toBe('Ceramics Workshop')
    expect(screen.days[0].overlapNote).toBe('2 plans have conflicts')
    expect(screen.days[0].events.map(e => e.overlap?.text)).toEqual(['Overlaps Poetry Reading by 30 min', 'Overlaps Ceramics Workshop by 30 min'])
    expect([screen.plannedCount, screen.overlapCount, screen.missingCount]).toEqual([4, 2, 1])
    // Plans store IDs only, so a missing plan has no title or time to show.
    expect(screen.missing).toEqual([{ id: 'gone-1' }])
  })

  it('moves Next up along as the clock passes each plan', () => {
    expect(presentSchedule(input, at('2026-11-07', '14:40')).nextUp).toMatchObject({ kind: 'now', when: 'Happening now · until 3:30pm' })
    expect(presentSchedule(input, at('2026-11-07', '15:45')).nextUp?.stub.title).toBe('Poetry Reading')
    const evening = presentSchedule(input, at('2026-11-07', '16:30'))
    expect(evening.nextUp).toMatchObject({ kind: 'tomorrow', when: 'Tomorrow at 7:00pm' })
    expect(evening.done.map(d => d.title)).toEqual(['Ceramics Workshop', 'Poetry Reading'])
    expect(evening.overlapCount).toBe(0)
    expect(presentSchedule(input, at('2026-11-04', '09:00')).nextUp).toMatchObject({ kind: 'later', when: 'Sat 11/7 at 2:30pm' })
    expect(presentSchedule(input, at('2026-11-09', '09:00')).nextUp).toBeNull()
  })

  it('separates empty from unreadable storage', () => {
    expect(presentSchedule({ ids: [], entries: [], missingIds: [] }).status).toBe('empty')
    expect(presentSchedule({ ids: [], entries: [], missingIds: [], blocked: true }).status).toBe('blocked')
  })
})
