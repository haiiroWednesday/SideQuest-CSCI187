import { describe, expect, it } from 'vitest'
import { addBusy, fillGap, freeWindows, paintMarks, presentMarks } from '../src/controller/freeMarks'
import type { LegacyCampusEvent } from '../src/model/events'

// Tuesday 24 November 2026, 10:40 in Santa Clara. Planned: class 11:00–12:00 and lab 13:00–18:00.
const NOW = new Date('2026-11-24T18:40:00Z')
const ev = (id: string, start: string, end: string, date = '2026-11-24') =>
  ({ id, date, start, end, title: id, host: 'Host', location: 'Library', description: '' }) as unknown as LegacyCampusEvent
const base = { events: [ev('class', '11:00', '12:00'), ev('lab', '13:00', '18:00')], plannedIds: ['class', 'lab'], now: NOW, marks: {} }
const cell = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h * 60 + m - 480) / 30 }
const today = (ws: { date: string; start: string; end: string }[]) => ws.filter(w => w.date === '2026-11-24').map(w => `${w.start}-${w.end}`)

describe('free time comes from busy time', () => {
  it('shows a week starting today, with past and My Schedule time blocked', () => {
    const m = presentMarks(base)
    expect(m.days.map(d => d.date)).toEqual(['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30'])
    expect(m.days[0].dow).toBe('Today')
    expect(m.cells[cell('09:00')].state).toBe('past')
    expect(m.cells[cell('10:30')].state).toBe('free')
    expect(m.cells[cell('11:00')].state).toBe('busy')
    expect(m.cells[cell('15:00')].state).toBe('busy')
  })

  it('with nothing marked, the free gaps are what My Schedule leaves (an hour or more)', () => {
    // 10:30–11:00 is only half an hour, so it is too short to be a gap.
    expect(today(freeWindows(base))).toEqual(['12:00-13:00', '18:00-23:00'])
    expect(presentMarks(base).windows.map(w => w.label)).toEqual(['12–1pm', '6–11pm'])
  })

  it('dragging busy time splits a gap', () => {
    const marks = paintMarks({ ...base, date: '2026-11-24' }, cell('19:00'), cell('20:30'), true)
    expect(today(freeWindows({ ...base, marks }))).toEqual(['12:00-13:00', '18:00-19:00', '21:00-23:00'])
    expect(presentMarks({ ...base, marks }).mine.map(r => r.label)).toEqual(['7–9pm'])
  })

  it('a drag across My Schedule time marks only the open half hours', () => {
    const marks = paintMarks({ ...base, date: '2026-11-24' }, cell('12:00'), cell('18:30'), true)
    expect(marks['2026-11-24']).toEqual([cell('12:00'), cell('12:30'), cell('18:00'), cell('18:30')])
    expect(today(freeWindows({ ...base, marks }))).toEqual(['19:00-23:00'])
  })

  it('dragging back over busy time frees it again', () => {
    const busy = paintMarks({ ...base, date: '2026-11-24' }, cell('19:00'), cell('22:30'), true)
    const back = paintMarks({ ...base, marks: busy, date: '2026-11-24' }, cell('19:00'), cell('22:30'), false)
    expect(back).toEqual({})
  })

  it('typed busy time rounds out to whole half hours', () => {
    const marks = addBusy({ ...base, date: '2026-11-24' }, '19:15', '20:10')!
    expect(presentMarks({ ...base, marks }).mine.map(r => r.label)).toEqual(['7–8:30pm'])
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

  it('"Busy then" fills a whole gap', () => {
    const w = presentMarks(base).windows[0]
    const marks = fillGap(base, w)
    expect(today(freeWindows({ ...base, marks }))).toEqual(['18:00-23:00'])
  })

  it('busy time on another day only changes that day', () => {
    const marks = paintMarks({ ...base, date: '2026-11-26' }, cell('09:00'), cell('16:30'), true)
    const thu = freeWindows({ ...base, marks }).filter(w => w.date === '2026-11-26').map(w => `${w.start}-${w.end}`)
    expect(thu).toEqual(['08:00-09:00', '17:00-23:00'])
    expect(today(freeWindows({ ...base, marks }))).toEqual(['12:00-13:00', '18:00-23:00'])
    expect(presentMarks({ ...base, marks }).days[2].marked).toBe(16)
  })

  it('Tonight narrows the search to free time after 5pm today', () => {
    expect(freeWindows({ ...base, when: 'tonight' })).toEqual([{ date: '2026-11-24', start: '18:00', end: '23:00' }])
    const m = presentMarks({ ...base, when: 'tonight' })
    expect(m.shortcuts.find(s => s.on)!.label).toBe('Tonight')
    expect(m.whenNote).toBeNull()
  })

  it('the choice is one of four, and This week is the default', () => {
    expect(presentMarks(base).shortcuts.map(s => `${s.label}${s.on ? '*' : ''}`)).toEqual(['This week*', 'Now', 'This afternoon', 'Tonight'])
  })

  it('Now while free is the gap you are in, from this half hour', () => {
    const at1230 = new Date('2026-11-24T20:30:00Z')
    expect(freeWindows({ ...base, now: at1230, when: 'now' })).toEqual([{ date: '2026-11-24', start: '12:30', end: '13:00' }])
  })

  it('Now while busy looks ahead to the next free time and says so', () => {
    const at11 = new Date('2026-11-24T19:10:00Z')
    expect(freeWindows({ ...base, now: at11, when: 'now' })).toEqual([{ date: '2026-11-24', start: '12:00', end: '13:00' }])
    expect(presentMarks({ ...base, now: at11, when: 'now' }).whenNote).toBe('Busy now. Free at 12pm')
  })

  it('Tonight with every evening half hour busy finds nothing and says so', () => {
    const marks = addBusy({ ...base, date: '2026-11-24' }, '17:00', '23:00')!
    expect(freeWindows({ ...base, marks, when: 'tonight' })).toEqual([])
    expect(presentMarks({ ...base, marks, when: 'tonight' }).whenNote).toBe('No free time tonight')
  })
})
