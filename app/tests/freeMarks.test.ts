import { describe, expect, it } from 'vitest'
import { CELL, MIN_GAP_MINUTES, addBusy, editBusy, fillGap, freeWindows, paintMarks, presentMarks, reshapeBusy } from '../src/controller/freeMarks'
import type { LegacyCampusEvent } from '../src/model/events'

// Tuesday 24 November 2026, 10:40 in Santa Clara. Planned: class 11:00–12:00 and lab 13:00–18:00.
const NOW = new Date('2026-11-24T18:40:00Z')
const ev = (id: string, start: string, end: string, date = '2026-11-24') =>
  ({ id, date, start, end, title: id, host: 'Host', location: 'Library', description: '' }) as unknown as LegacyCampusEvent
const base = { events: [ev('class', '11:00', '12:00'), ev('lab', '13:00', '18:00')], plannedIds: ['class', 'lab'], now: NOW, marks: {} }
const cell = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h * 60 + m) / CELL }
/** The last step before a time: drags and stretches are inclusive of their last step. */
const upto = (hhmm: string) => cell(hhmm) - 1
const steps = (from: string, to: string) => Array.from({ length: cell(to) - cell(from) }, (_, i) => cell(from) + i)
const today = (ws: { date: string; start: string; end: string }[]) => ws.filter(w => w.date === '2026-11-24').map(w => `${w.start}-${w.end}`)

describe('free time comes from busy time', () => {
  it('shows a week starting today, with past and My Schedule time blocked', () => {
    const m = presentMarks(base)
    expect(m.days.map(d => d.date)).toEqual(['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30'])
    expect(m.days[0].dow).toBe('Today')
    expect(m.cells[cell('09:00')].state).toBe('past')
    expect(m.cells[cell('10:35')].state).toBe('past')
    expect(m.cells[cell('10:40')].state).toBe('free')
    expect(m.cells[cell('11:00')].state).toBe('busy')
    expect(m.cells[cell('15:00')].state).toBe('busy')
  })

  it('with nothing marked, the free gaps are what My Schedule leaves (20 minutes or more)', () => {
    // Nov 25: with one mode, a short break counts. 10:40–11:00 is 20 minutes, the least that does.
    expect(today(freeWindows(base))).toEqual(['10:40-11:00', '12:00-13:00', '18:00-23:59'])
    expect(presentMarks(base).windows.map(w => w.label)).toEqual(['10:40–11am', '12–1pm', '6pm–12am'])
  })

  it('dragging busy time splits a gap', () => {
    const marks = paintMarks({ ...base, date: '2026-11-24' }, cell('19:00'), upto('21:00'), true)
    expect(today(freeWindows({ ...base, marks }))).toEqual(['10:40-11:00', '12:00-13:00', '18:00-19:00', '21:00-23:59'])
    expect(presentMarks({ ...base, marks }).mine.map(r => r.label)).toEqual(['7–9pm'])
  })

  it('a drag across My Schedule time marks only the open steps', () => {
    const marks = paintMarks({ ...base, date: '2026-11-24' }, cell('12:00'), upto('19:00'), true)
    expect(marks['2026-11-24']).toEqual([...steps('12:00', '13:00'), ...steps('18:00', '19:00')])
    expect(today(freeWindows({ ...base, marks }))).toEqual(['10:40-11:00', '19:00-23:59'])
  })

  it('dragging back over busy time frees it again', () => {
    const busy = paintMarks({ ...base, date: '2026-11-24' }, cell('19:00'), upto('23:00'), true)
    const back = paintMarks({ ...base, marks: busy, date: '2026-11-24' }, cell('19:00'), upto('23:00'), false)
    expect(back).toEqual({})
  })

  it('typed busy time keeps its five-minute times', () => {
    const marks = addBusy({ ...base, date: '2026-11-24' }, '19:15', '20:10')!
    expect(presentMarks({ ...base, marks }).mine.map(r => r.label)).toEqual(['7:15–8:10pm'])
  })

  it('typed busy time that ends before it starts is refused', () => {
    expect(addBusy({ ...base, date: '2026-11-24' }, '20:00', '19:00')).toBeNull()
    expect(addBusy({ ...base, date: '2026-11-24' }, '', '19:00')).toBeNull()
  })

  it('rejects impossible clock values instead of normalizing them into another time', () => {
    const input = { ...base, date: '2026-11-24' }
    expect(addBusy(input, '12:60', '15:00')).toBeNull()
    expect(addBusy(input, '19:00', '24:00')).toBeNull()
    expect(addBusy(input, '08:00', '09:99')).toBeNull()
  })

  it('a gap shorter than 20 minutes is not free time', () => {
    expect(MIN_GAP_MINUTES).toBe(20)
    // busy 10:55–11:00 leaves 10:40–10:55, 15 minutes: too short
    const marks = paintMarks({ ...base, date: '2026-11-24' }, cell('10:55'), upto('11:00'), true)
    expect(today(freeWindows({ ...base, marks }))).toEqual(['12:00-13:00', '18:00-23:59'])
  })

  it('typing new times for a busy stretch moves it in one change', () => {
    const drawn = paintMarks({ ...base, date: '2026-11-24' }, cell('19:00'), upto('21:00'), true)
    const run = presentMarks({ ...base, marks: drawn }).mine[0]
    expect([run.start, run.end]).toEqual(['19:00', '21:00'])
    const moved = editBusy({ ...base, marks: drawn, date: '2026-11-24' }, run, '19:00', '20:15')!
    expect(presentMarks({ ...base, marks: moved }).mine.map(r => r.label)).toEqual(['7–8:15pm'])
    // an end before the start is refused and nothing changes
    expect(editBusy({ ...base, marks: drawn, date: '2026-11-24' }, run, '21:00', '20:00')).toBeNull()
    // it never lands on My Schedule time: 17:00–19:30 keeps only the open part from 18:00
    const clipped = editBusy({ ...base, marks: drawn, date: '2026-11-24' }, run, '17:00', '19:30')!
    expect(presentMarks({ ...base, marks: clipped }).mine.map(r => r.label)).toEqual(['6–7:30pm'])
  })

  it('"Mark busy" fills a whole gap', () => {
    const w = presentMarks(base).windows.find(x => x.label === '12–1pm')!
    const marks = fillGap(base, w)
    expect(today(freeWindows({ ...base, marks }))).toEqual(['10:40-11:00', '18:00-23:59'])
  })

  it('busy time on another day only changes that day', () => {
    const marks = paintMarks({ ...base, date: '2026-11-26' }, cell('09:00'), upto('17:00'), true)
    const thu = freeWindows({ ...base, marks }).filter(w => w.date === '2026-11-26').map(w => `${w.start}-${w.end}`)
    expect(thu).toEqual(['07:00-09:00', '17:00-23:59'])
    expect(today(freeWindows({ ...base, marks }))).toEqual(['10:40-11:00', '12:00-13:00', '18:00-23:59'])
    expect(presentMarks({ ...base, marks }).days[2].marked).toBe(8 * 60 / CELL)
  })

  it('Tonight narrows the search to free time after 5pm today', () => {
    expect(freeWindows({ ...base, when: 'tonight' })).toEqual([{ date: '2026-11-24', start: '18:00', end: '23:59' }])
    const m = presentMarks({ ...base, when: 'tonight' })
    expect(m.shortcuts.find(s => s.on)!.label).toBe('Tonight')
    expect(m.whenNote).toBeNull()
  })

  it('the choice is one of four, and This week is the default', () => {
    expect(presentMarks(base).shortcuts.map(s => `${s.label}${s.on ? '*' : ''}`)).toEqual(['This week*', 'Now', 'This afternoon', 'Tonight'])
  })

  it('Now while free is the gap you are in, from this step', () => {
    const at1230 = new Date('2026-11-24T20:30:00Z')
    expect(freeWindows({ ...base, now: at1230, when: 'now' })).toEqual([{ date: '2026-11-24', start: '12:30', end: '13:00' }])
  })

  it('Now while busy looks ahead to the next free time and says so', () => {
    const at11 = new Date('2026-11-24T19:10:00Z')
    expect(freeWindows({ ...base, now: at11, when: 'now' })).toEqual([{ date: '2026-11-24', start: '12:00', end: '13:00' }])
    expect(presentMarks({ ...base, now: at11, when: 'now' }).whenNote).toBe('Busy now. Free at 12pm')
  })

  it('Tonight with every evening half hour busy finds nothing and says so', () => {
    const marks = addBusy({ ...base, date: '2026-11-24' }, '17:00', '23:59')!
    expect(freeWindows({ ...base, marks, when: 'tonight' })).toEqual([])
    expect(presentMarks({ ...base, marks, when: 'tonight' }).whenNote).toBe('No free time tonight')
  })
})

describe('busy blocks you can pick up on the bar', () => {
  const day = { ...base, date: '2026-11-24' }
  const seven = paintMarks(day, cell('19:00'), upto('21:00'), true)
  it('moving a block lifts the old time and lays down the new', () => {
    const marks = reshapeBusy({ ...day, marks: seven }, { first: cell('19:00'), last: upto('21:00') }, cell('21:00'), upto('23:00'))
    expect(presentMarks({ ...base, marks }).mine.map(r => r.label)).toEqual(['9–11pm'])
  })
  it('stretching an end keeps the other end where it was', () => {
    const marks = reshapeBusy({ ...day, marks: seven }, { first: cell('19:00'), last: upto('21:00') }, cell('19:00'), upto('22:00'))
    expect(presentMarks({ ...base, marks }).mine.map(r => r.label)).toEqual(['7–10pm'])
  })
  it('a new drag adds a block and never paints over My Schedule', () => {
    const marks = reshapeBusy(day, null, cell('17:00'), upto('20:00'))
    expect(marks['2026-11-24']).toEqual(steps('18:00', '20:00'))
  })
  it('a block moved onto My Schedule time keeps only the open steps', () => {
    const marks = reshapeBusy({ ...day, marks: seven }, { first: cell('19:00'), last: upto('21:00') }, cell('16:00'), upto('19:30'))
    expect(marks['2026-11-24']).toEqual(steps('18:00', '19:30'))
  })
})

// Nov 27, Cyn (P2): busy time that came from Google Calendar is drawn in Google's blue.
describe('Google busy time on the bar', () => {
  const tomorrow = '2026-11-25'
  const at = (from: string, to: string) => ({ [tomorrow]: steps(from, to) })

  it('marks the Google part of busy time, and only inside busy time', () => {
    const m = presentMarks({ ...base, date: tomorrow, marks: { [tomorrow]: [...steps('09:00', '10:00'), ...steps('14:00', '15:00')] }, calendar: at('09:00', '10:00') })
    expect(m.google.map(r => `${r.start}-${r.end}`)).toEqual(['09:00-10:00'])
    expect(m.mine.map(r => `${r.start}-${r.end}`)).toEqual(['09:00-10:00', '14:00-15:00'])
  })

  it('keeps exact Google minutes that fall on the steps', () => {
    const m = presentMarks({ ...base, date: tomorrow, marks: at('11:15', '12:00'), calendar: at('11:15', '12:00') })
    expect(m.google.map(r => r.label)).toEqual(m.mine.map(r => r.label))
  })

  it('draws no Google time where busy time was taken away, in the past, or in Free mode', () => {
    expect(presentMarks({ ...base, date: tomorrow, marks: {}, calendar: at('09:00', '10:00') }).google).toEqual([])
    expect(presentMarks({ ...base, marks: { '2026-11-24': steps('09:00', '10:00') }, calendar: { '2026-11-24': steps('09:00', '10:00') } }).google).toEqual([])
    expect(presentMarks({ ...base, date: tomorrow, mode: 'free', marks: at('09:00', '10:00'), calendar: at('09:00', '10:00') }).google).toEqual([])
  })

  it('without calendar steps there is no Google time', () => {
    expect(presentMarks({ ...base, date: tomorrow, marks: at('09:00', '10:00') }).google).toEqual([])
  })
})

// Nov 27 (D7): the week view reads every day of the week from one model.
describe('the week', () => {
  const tomorrow = '2026-11-25'
  it('has seven days, today first and the open day marked', () => {
    const m = presentMarks({ ...base, date: tomorrow, marks: {} })
    expect(m.week).toHaveLength(7)
    expect(m.week[0]).toMatchObject({ date: '2026-11-24', today: true, selected: false })
    expect(m.week[1]).toMatchObject({ date: tomorrow, selected: true })
  })
  it('gives each day its own busy time, Google time and free stretches, not only the open day', () => {
    const m = presentMarks({ ...base, marks: { [tomorrow]: [...steps('09:00', '10:00'), ...steps('14:00', '15:00')] }, calendar: { [tomorrow]: steps('09:00', '10:00') } })
    const day = m.week[1]
    expect(day.mine.map(r => `${r.start}-${r.end}`)).toEqual(['09:00-10:00', '14:00-15:00'])
    expect(day.google.map(r => `${r.start}-${r.end}`)).toEqual(['09:00-10:00'])
    expect(day.free.length).toBeGreaterThan(0)
    expect(day.free.every(f => !day.mine.some(b => f.first <= b.last && b.first <= f.last))).toBe(true)
  })
  it('greys out the past only on today', () => {
    const m = presentMarks({ ...base, marks: {} })
    expect(m.week[0].past).toBeGreaterThan(0)
    expect(m.week.slice(1).every(d => d.past === 0)).toBe(true)
  })
})
