import { describe, expect, it } from 'vitest'
import { MIN_COLUMN_SHARERS, commonTime, personColumns, type CommonTime, type FreeShare, type Slot, type SocialGroup } from '../src/controller/socialPlans'
import { MAX_PERSON_COLUMNS, eventsInWindow, groupTimetable } from '../src/controller/groupsPreview'
import { findEvents } from '../src/controller/findEvents'
import { DAY_END, FREE_FROM as DAY_START } from '../src/controller/freeMarks'

// The group timetable on Groups: one column per person who shares, time down the page.
// Privacy rules kept here: nothing until you share, a pair sees the common band only (security review
// M4: a pair's columns would hand one person the other's whole free week), free or busy only.

// 10:40 on Tuesday 24 November 2026, Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const TODAY = '2026-11-24'
const g: SocialGroup = { id: 'g1', name: 'Swig', members: ['Maya', 'Jun', 'Theo', 'You'] }
const share = (person: string, slots: Slot[], groupId = 'g1'): FreeShare => ({ person, groupId, slots })
const day = (start: string, end: string, date = TODAY): Slot => ({ date, start, end })
const three = [
  share('Maya', [day('11:30', '14:00'), day('17:00', '21:00')]),
  share('Jun', [day('12:00', '15:00')]),
  share('You', [day('12:00', '13:30'), day('18:00', '19:00'), day('09:00', '10:00', '2026-11-25')]),
]

describe('group timetable: who gets a column', () => {
  it('shows nothing until you share your own free time, however many others share', () => {
    const c = commonTime(g, [share('Maya', [day('12:00', '15:00')]), share('Jun', [day('12:00', '15:00')]), share('Theo', [day('12:00', '15:00')])], 'You', NOW)
    expect(c.locked).toBe(true)
    expect(personColumns(c)).toBeNull()
    expect(groupTimetable(c, TODAY)).toBeNull()
  })

  it('shows nothing when you are the only one sharing', () => {
    const c = commonTime(g, [share('You', [day('12:00', '15:00')])], 'You', NOW)
    expect(personColumns(c)).toBeNull()
    expect(groupTimetable(c, TODAY)).toBeNull()
  })

  it('gives a pair the common band only, never per-person columns', () => {
    expect(MIN_COLUMN_SHARERS).toBe(3)
    // The hole: you share the whole day, and a column for Maya would be her whole free schedule.
    const c = commonTime(g, [share('You', [day('00:00', '23:59')]), share('Maya', [day('11:30', '14:00'), day('17:00', '21:00')])], 'You', NOW)
    expect(c.shared).toEqual(['Maya', 'You'])
    expect(personColumns(c)).toBeNull()
    const t = groupTimetable(c, TODAY)!
    expect(t.columns).toBeNull()
    expect(t.bands.map(b => b.label)).toEqual(['11:30am–2pm', '5–9pm'])
  })

  it('keeps per-person stretches off the result the server sends: the overlap alone travels', () => {
    const c = commonTime(g, three, 'You', NOW)
    expect(personColumns(c)).not.toBeNull()
    expect(Object.keys(c).sort()).toEqual(['locked', 'notShared', 'shared', 'windows'])
    expect(JSON.parse(JSON.stringify(c))).toEqual({ windows: [day('12:00', '13:30')], shared: ['Maya', 'Jun', 'You'], notShared: ['Theo'], locked: false })
    // a copy of a result (after JSON, a spread) has no columns: band only
    expect(personColumns({ ...c })).toBeNull()
    expect(groupTimetable({ ...c }, TODAY)!.columns).toBeNull()
  })

  it('cannot be talked into columns for a pair or a locked viewer', () => {
    const real = commonTime(g, three, 'You', NOW)
    const forged = { ...real, free: personColumns(real) } as CommonTime
    expect(groupTimetable(forged, TODAY)!.columns).toBeNull()
    const pair = commonTime(g, three.slice(1), 'You', NOW)
    expect(groupTimetable(Object.assign(pair, { free: personColumns(real) }), TODAY)!.columns).toBeNull()
    // a real three-sharer result that later claims fewer sharers, or a locked viewer, gets no columns
    expect(personColumns(Object.assign(commonTime(g, three, 'You', NOW), { shared: ['Maya', 'You'] }))).toBeNull()
    expect(groupTimetable(Object.assign(commonTime(g, three, 'You', NOW), { locked: true }), TODAY)).toBeNull()
  })

  it('from three sharers up: one column each, you first, then people who have not shared', () => {
    const c = commonTime(g, three, 'You', NOW)
    expect(personColumns(c)!.map(p => p.person)).toEqual(['You', 'Maya', 'Jun'])
    const t = groupTimetable(c, TODAY)!
    expect(t.columns!.map(col => [col.key, col.shared])).toEqual([['You', true], ['Maya', true], ['Jun', true], ['Theo', false]])
    expect([t.from, t.to]).toEqual([DAY_START, DAY_END])
  })

  it('draws free time only, for the chosen day only', () => {
    const t = groupTimetable(commonTime(g, three, 'You', NOW), TODAY)!
    const col = (k: string) => t.columns!.find(c => c.key === k)!
    expect(col('You').free).toEqual([{ from: 12 * 60, to: 13 * 60 + 30 }, { from: 18 * 60, to: 19 * 60 }])
    expect(col('Maya').free).toEqual([{ from: 11 * 60 + 30, to: 14 * 60 }, { from: 17 * 60, to: 21 * 60 }])
    const next = groupTimetable(commonTime(g, three, 'You', NOW), '2026-11-25')!
    expect(next.columns!.find(c => c.key === 'You')!.free).toEqual([{ from: 9 * 60, to: 10 * 60 }])
    expect(next.columns!.find(c => c.key === 'Maya')!.free).toEqual([])
  })

  it('never carries what or where: a column is free blocks and nothing else', () => {
    const leaky = [...three.slice(1), share('Maya', [{ ...day('11:30', '14:00'), title: 'Therapy', place: 'Cowell' } as never])]
    const c = commonTime(g, leaky, 'You', NOW)
    const t = groupTimetable(c, TODAY)!
    expect(JSON.stringify([personColumns(c), t])).not.toMatch(/Therapy|Cowell|title|place/)
    for (const col of t.columns!) {
      expect(Object.keys(col).sort()).toEqual(['free', 'key', 'people', 'shared'])
      for (const b of col.free) expect(Object.keys(b).sort()).toEqual(['from', 'to'])
    }
  })

  it('people who have not shared get an empty marked column, never a guess', () => {
    const t = groupTimetable(commonTime(g, three, 'You', NOW), TODAY)!
    const theo = t.columns!.find(c => c.key === 'Theo')!
    expect(theo).toEqual({ key: 'Theo', people: ['Theo'], shared: false, free: [] })
  })

  it('keeps blocks inside the hours drawn (7am to midnight)', () => {
    const early = [share('You', [day('06:00', '09:00')]), share('Maya', [day('07:00', '09:30'), day('22:00', '23:30')]), share('Jun', [day('06:30', '10:00')])]
    const t = groupTimetable(commonTime(g, early, 'You', NOW), TODAY)!
    expect(t.columns!.find(c => c.key === 'Maya')!.free).toEqual([{ from: DAY_START, to: 9 * 60 + 30 }, { from: 22 * 60, to: 23 * 60 + 30 }])
    // the band keeps its real time in words, and is drawn from 7am
    expect(t.bands).toEqual([{ date: TODAY, start: '07:00', end: '09:00', from: DAY_START, to: 9 * 60, label: '7–9am' }])
  })

  it('folds people who have not shared into one column once there are more than six', () => {
    expect(MAX_PERSON_COLUMNS).toBe(6)
    const big: SocialGroup = { id: 'g1', name: 'Hall', members: ['You', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] }
    const shares = ['You', 'A', 'B', 'C', 'D'].map(p => share(p, [day('12:00', '14:00')]))
    const t = groupTimetable(commonTime(big, shares, 'You', NOW), TODAY)!
    expect(t.columns!.map(c => c.key)).toEqual(['You', 'A', 'B', 'C', 'D', 'not-shared'])
    expect(t.columns![5]).toEqual({ key: 'not-shared', people: ['E', 'F', 'G'], shared: false, free: [] })
    // six people fit as they are
    const six: SocialGroup = { ...big, members: ['You', 'A', 'B', 'C', 'E', 'F'] }
    expect(groupTimetable(commonTime(six, shares, 'You', NOW), TODAY)!.columns!.map(c => c.key)).toEqual(['You', 'A', 'B', 'C', 'E', 'F'])
  })
})

describe('group timetable: the band when everyone who shared is free', () => {
  it('is the existing common time, for the chosen day, with its time in words', () => {
    const c = commonTime(g, three, 'You', NOW)
    const t = groupTimetable(c, TODAY)!
    expect(t.bands).toEqual([{ date: TODAY, start: '12:00', end: '13:30', from: 720, to: 810, label: '12–1:30pm' }])
    expect(t.bands.map(({ date, start, end }) => ({ date, start, end }))).toEqual(c.windows.filter(w => w.date === TODAY))
    expect(groupTimetable(c, '2026-11-25')!.bands).toEqual([])
  })
})

describe('events that fit a band', () => {
  const ev = (id: string, start: string, end: string, date = TODAY) => ({ id, title: `Event ${id}`, location: 'Benson', date, start, end, hostName: 'Club' })
  const events = [ev('late', '13:00', '14:00'), ev('in', '12:00', '13:00'), ev('edge', '12:30', '13:30'), ev('over', '13:00', '13:45'), ev('tomorrow', '12:00', '13:00', '2026-11-25'), ev('before', '11:30', '12:30')]
  const band = day('12:00', '13:30')

  it("uses Discover's own full-fit rule, so the two pages never disagree", () => {
    const ours = eventsInWindow(events, band)
    const discover = findEvents(events, band.date, band.start, band.end).matches.map(e => e.id).sort()
    expect(ours.map(e => e.id).sort()).toEqual(discover)
    expect(ours.map(e => e.id)).toEqual(['in', 'edge'])
  })
  it('keeps the list order and the whole event record', () => {
    expect(eventsInWindow(events, band)[0]).toBe(events[1])
  })
  it('a window that is not a real stretch fits nothing', () => {
    expect(eventsInWindow(events, day('13:30', '12:00'))).toEqual([])
    expect(eventsInWindow(events, { date: 'soon', start: '12:00', end: '13:30' })).toEqual([])
  })
})
