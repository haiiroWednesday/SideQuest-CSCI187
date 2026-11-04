import { describe, expect, it } from 'vitest'
import { presentDiscover, presentSchedule, type ScreenEvent } from '../src/controller/presentScreens'
import { campusAt as at, inTimeZone } from './helpers/campusTime'

// Every clock in this file is a Santa Clara wall-clock time (the agreed contract),
// built as a real instant so the results do not depend on the test machine's zone.
let n = 0
const ev = (date: string, start: string, end: string, extra: Partial<ScreenEvent> = {}): ScreenEvent => ({
  id: `e${++n}`, title: `Event ${n}`, location: 'Library', date, start, end, ...extra,
})

// Independent expectation for a day label: computed with plain arithmetic on the
// calendar date, not with the presenter's own helper.
function expectedTag(date: string, today: string): string {
  const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000
  const gap = day(date) - day(today)
  const dow = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(day(date) * 86400000).getUTCDay()]
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  if (gap === 0) return 'TODAY'
  if (gap === 1) return 'TOMORROW'
  if (gap <= 6) return dow
  if (gap <= 13) return `IN ${gap} DAYS`
  return `${months[+date.slice(5, 7) - 1]} ${+date.slice(8, 10)}`
}

describe('presentDiscover: the campus clock decides the labels', () => {
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

  it('gives a visitor in New York or Tokyo the same campus answer as one in Santa Clara', () => {
    // Noon in Santa Clara. In New York it is 3pm; in Tokyo it is already tomorrow morning.
    const noon = at('2026-11-04', '12:00')
    const list = [ev('2026-11-04', '13:00', '14:00', { id: 'one-pm', title: 'One pm' })]
    const answer = (zone: string) => inTimeZone(zone, () => {
      const screen = presentDiscover({ events: list, now: noon })
      return screen.days.map(d => [d.tag, d.events.map(e => [e.id, e.live?.text ?? null])])
    })
    const expected = [['TODAY', [['one-pm', 'Starts in 1 hr']]]]
    expect(answer('America/Los_Angeles')).toEqual(expected)
    expect(answer('America/New_York')).toEqual(expected)
    expect(answer('Asia/Tokyo')).toEqual(expected)
    expect(answer('UTC')).toEqual(expected)
  })

  it('uses the Model’s end rule: an event is gone the minute it ends, and starting soon is said', () => {
    const today = [
      ev('2026-11-04', '08:00', '09:00', { title: 'Ended' }),
      ev('2026-11-04', '09:00', '12:00', { title: 'Ends now' }),
      ev('2026-11-04', '11:00', '12:01', { title: 'One minute left' }),
      ev('2026-11-04', '12:25', '13:00', { title: 'Soon' }),
      ev('2026-11-04', '14:00', '15:00', { title: 'Later' }),
    ]
    const screen = presentDiscover({ events: today, now: at('2026-11-04', '12:00') })
    const stubs = screen.days[0].events
    expect(stubs.map(s => s.title)).toEqual(['One minute left', 'Soon', 'Later'])
    expect(stubs.map(s => s.live?.text ?? null)).toEqual(['Happening now · until 12:01pm', 'Starts in 25 min', null])
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

  it('with a complete window, lists only what fits; Show all brings everything back with fits marked', () => {
    const list = [ev('2026-11-04', '14:30', '15:30', { id: 'in' }), ev('2026-11-04', '15:00', '16:30', { id: 'out' })]
    const now = at('2026-11-04', '09:00')
    const ids = (s: ReturnType<typeof presentDiscover>) => s.days.flatMap(d => d.events.map(e => `${e.id}:${e.fit}`))

    const partial = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '14:00', end: '' } })
    expect(partial.freeWindow).toMatchObject({ active: false, fitText: null, error: null, canClear: true })
    expect(ids(partial)).toEqual(['in:null', 'out:null'])

    const full = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '14:00', end: '16:00' } })
    expect(full.freeWindow).toMatchObject({ active: true, fitCount: 1, fitText: '1 fit', summary: 'Wed 11/4, 2:00–4:00pm', showingAll: false })
    expect(ids(full)).toEqual(['in:fits'])

    const all = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '14:00', end: '16:00' }, showAll: true })
    expect(all.freeWindow?.showingAll).toBe(true)
    expect(ids(all)).toEqual(['in:fits', 'out:outside'])

    // Inclusive edges: an event that exactly fills the window fits.
    const edge = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '14:30', end: '15:30' } })
    expect(ids(edge)).toEqual(['in:fits'])

    const backwards = presentDiscover({ events: list, now, freeWindow: { date: '2026-11-04', start: '16:00', end: '14:00' } })
    expect(backwards.freeWindow?.error).toBe('Please choose an end time later than your start time.')
    expect(ids(backwards)).toEqual(['in:null', 'out:null'])
  })

  it('says plainly when nothing fits, instead of showing a list that did not match', () => {
    const list = [ev('2026-11-04', '14:30', '15:30')]
    const none = presentDiscover({ events: list, now: at('2026-11-04', '09:00'), freeWindow: { date: '2026-11-05', start: '08:00', end: '09:00' } })
    expect([none.status, none.freeWindow?.fitText, none.freeWindow?.summary, none.days.length]).toEqual(['nomatch', 'Nothing fits', 'Thu 11/5, 8:00–9:00am', 0])
    // No events at all is "empty", not "nothing fits".
    expect(presentDiscover({ events: [], freeWindow: { date: '2026-11-05', start: '08:00', end: '09:00' } }).status).toBe('empty')
  })

  it('keeps every upcoming event once, in order within and across days, for 300 random catalogs', () => {
    let seed = 7
    const rand = (k: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k }
    const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    for (let run = 0; run < 300; run++) {
      const clock = hhmm(rand(24 * 60))
      const now = at('2026-11-04', clock)
      const events = Array.from({ length: rand(25) }, () => {
        const day = 1 + rand(40)
        const date = `2026-${day > 30 ? 12 : 11}-${String(day > 30 ? day - 30 : day).padStart(2, '0')}`
        const start = rand(23 * 4) * 15
        return ev(date, hhmm(start), hhmm(Math.min(start + 15 + rand(8) * 15, 23 * 60 + 59)))
      })
      const screen = presentDiscover({ events, now })
      const shown = screen.days.flatMap(d => d.events)
      // Upcoming means: a later date, or today and ending after the campus minute (the Model's rule).
      const expected = events.filter(e => e.date > '2026-11-04' || (e.date === '2026-11-04' && e.end > clock))
      expect(shown.map(s => s.id).sort()).toEqual(expected.map(e => e.id).sort())
      screen.days.forEach((day, i) => {
        expect(day.events.every(e => e.date === day.date)).toBe(true)
        if (i) expect(day.date > screen.days[i - 1].date).toBe(true)
        expect(day.tag).toBe(expectedTag(day.date, '2026-11-04'))
        const starts = day.events.map(e => events.find(x => x.id === e.id)!.start)
        expect(starts).toEqual([...starts].sort())
      })
    }
  })
})

describe('presentSchedule: Next up, conflicts and missing plans', () => {
  const ceramics = ev('2026-11-07', '14:30', '15:30', { id: 'ceramics', title: 'Ceramics Workshop' })
  const poetry = ev('2026-11-07', '15:00', '16:00', { id: 'poetry', title: 'Poetry Reading' })
  const mic = ev('2026-11-08', '19:00', '21:00', { id: 'mic', title: 'Open Mic Night' })
  const input = {
    ids: ['mic', 'poetry', 'gone-1', 'ceramics'],
    entries: [{ event: mic, conflict: null }, { event: poetry, conflict: ceramics }, { event: ceramics, conflict: poetry }],
    missingIds: ['gone-1'],
  }

  it('counts down to the next plan and lists each clash in the details', () => {
    const screen = presentSchedule(input, at('2026-11-07', '13:00'))
    expect(screen.nextUp).toMatchObject({ kind: 'today', when: 'in 1 hr 30 min' })
    expect(screen.nextUp?.stub.title).toBe('Ceramics Workshop')
    expect(screen.days[0].overlapNote).toBe('2 plans overlap')
    expect(screen.days[0].events.map(e => e.overlaps)).toEqual([
      [{ id: 'poetry', title: 'Poetry Reading', when: '3:00–3:30pm', length: '30 min' }],
      [{ id: 'ceramics', title: 'Ceramics Workshop', when: '3:00–3:30pm', length: '30 min' }],
    ])
    expect([screen.plannedCount, screen.overlapCount, screen.missingCount]).toEqual([4, 2, 1])
    // Plans store IDs only, so a missing plan has no title or time to show.
    expect(screen.missing).toEqual([{ id: 'gone-1' }])
  })

  it('keeps two separate clashes on one day separate, never one long invented range', () => {
    const a = ev('2026-11-07', '09:00', '10:00', { id: 'a', title: 'A' })
    const b = ev('2026-11-07', '09:30', '10:30', { id: 'b', title: 'B' })
    const c = ev('2026-11-07', '15:00', '16:00', { id: 'c', title: 'C' })
    const d = ev('2026-11-07', '15:30', '16:30', { id: 'd', title: 'D' })
    const screen = presentSchedule({
      ids: ['a', 'b', 'c', 'd'],
      entries: [{ event: a, conflict: b }, { event: b, conflict: a }, { event: c, conflict: d }, { event: d, conflict: c }],
      missingIds: [],
    }, at('2026-11-07', '08:00'))
    expect(screen.days[0].overlapNote).toBe('4 plans overlap')
    expect(Object.fromEntries(screen.days[0].events.map(e => [e.id, e.overlaps.map(o => `${o.id} ${o.when}`)]))).toEqual({
      a: ['b 9:30–10:00am'], b: ['a 9:30–10:00am'], c: ['d 3:30–4:00pm'], d: ['c 3:30–4:00pm'],
    })
  })

  it('lists every clash when one plan overlaps several, and treats touching edges as no overlap', () => {
    const a = ev('2026-11-07', '13:00', '17:00', { id: 'a', title: 'Long Workshop' })
    const b = ev('2026-11-07', '14:00', '15:00', { id: 'b', title: 'Talk' })
    const c = ev('2026-11-07', '16:30', '18:00', { id: 'c', title: 'Concert' })
    const d = ev('2026-11-07', '18:00', '19:00', { id: 'd', title: 'Dinner' })
    // The Schedule controller gives each clashing plan one representative conflict; Dinner only touches Concert.
    const screen = presentSchedule({
      ids: ['a', 'b', 'c', 'd'],
      entries: [{ event: a, conflict: b }, { event: b, conflict: a }, { event: c, conflict: a }, { event: d, conflict: null }],
      missingIds: [],
    }, at('2026-11-07', '09:00'))
    const byId = Object.fromEntries(screen.days[0].events.map(e => [e.id, e.overlaps.map(o => `${o.title} ${o.when}`)]))
    expect(byId).toEqual({ a: ['Talk 2:00–3:00pm', 'Concert 4:30–5:00pm'], b: ['Long Workshop 2:00–3:00pm'], c: ['Long Workshop 4:30–5:00pm'], d: [] })
    expect(screen.days[0].overlapNote).toBe('3 plans overlap')
    expect(screen.overlapCount).toBe(3)
  })

  it('moves Next up along as the campus clock passes each plan', () => {
    expect(presentSchedule(input, at('2026-11-07', '14:40')).nextUp).toMatchObject({ kind: 'now', when: 'Happening now · until 3:30pm' })
    expect(presentSchedule(input, at('2026-11-07', '15:30')).nextUp?.stub.title).toBe('Poetry Reading')
    const evening = presentSchedule(input, at('2026-11-07', '16:30'))
    expect(evening.nextUp).toMatchObject({ kind: 'tomorrow', when: 'Tomorrow at 7:00pm' })
    expect(evening.done.map(d => d.title)).toEqual(['Ceramics Workshop', 'Poetry Reading'])
    expect(evening.overlapCount).toBe(0)
    expect(presentSchedule(input, at('2026-11-04', '09:00')).nextUp).toMatchObject({ kind: 'later', when: 'Sat 11/7 at 2:30pm' })
    expect(presentSchedule(input, at('2026-11-09', '09:00')).nextUp).toBeNull()
  })

  it('separates empty, unreadable storage, a catalog still loading, and a catalog that failed', () => {
    expect(presentSchedule({ ids: [], entries: [], missingIds: [] }).status).toBe('empty')
    expect(presentSchedule({ ids: [], entries: [], missingIds: [], blocked: true }).status).toBe('blocked')
    const waiting = { ids: ['x'], entries: [], missingIds: ['x'] }
    expect(presentSchedule(waiting, new Date(), { loading: true }).status).toBe('loading')
    expect(presentSchedule(waiting, new Date(), { error: 'Offline' })).toMatchObject({ status: 'catalogError', errorMessage: 'Offline' })
    expect(presentSchedule(waiting, new Date()).status).toBe('ready')
  })

  it('passes the Schedule controller’s capacity notice through as written', () => {
    expect(presentSchedule({ ...input, capacityMessage: 'Limit reached.' }).capacityMessage).toBe('Limit reached.')
  })
})
