// Free mode on Discover (owner decision, Nov 25): mark the time you ARE free, to five minutes,
// and Discover lists only what fits fully, naming the nearest miss when nothing does.
import { describe, expect, it } from 'vitest'
import { CELL, addBusy, cellAtX, freeWindows, presentMarks, reshapeBusy, type MarkInput } from '../src/controller/freeMarks'
import { presentDiscover } from '../src/controller/presentDiscover'
import type { CampusEvent } from '../src/model/eventCatalog'

// Tuesday 24 November 2026, 10:40 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const ev = (id: string, title: string, start: string, end: string): CampusEvent =>
  ({ id, title, date: DAY, start, end, hostName: 'Club', location: 'Benson', description: 'x' })
const climbing = ev('climb', 'Climbing Club Intro', '13:30', '14:30')
const talk = ev('talk', 'Quick talk', '13:15', '13:45')
const lunch = ev('lunch', 'Long lunch', '12:00', '14:00')
const class11 = ev('class', 'Class', '11:00', '12:00')
const cell = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h * 60 + m - 480) / CELL }

function freeFrom(events: CampusEvent[], start: string, end: string): MarkInput {
  const input: MarkInput = { events, plannedIds: [], now: NOW, marks: {}, open: {}, mode: 'free' }
  return { ...input, open: addBusy({ ...input, marks: {}, date: DAY }, start, end)! }
}
const discover = (events: CampusEvent[], input: MarkInput) =>
  presentDiscover({ events, freeWindows: freeWindows(input), now: NOW })

describe('Free mode: 1:10 to 1:55 today', () => {
  it('is one free stretch, to the minute, even though it is under an hour', () => {
    const input = freeFrom([climbing, talk], '13:10', '13:55')
    expect(freeWindows(input)).toEqual([{ date: DAY, start: '13:10', end: '13:55' }])
    expect(presentMarks(input).windows.map(w => w.label)).toEqual(['1:10–1:55pm'])
  })
  it('lists only the events that fit fully', () => {
    const events = [climbing, talk, lunch]
    const screen = discover(events, freeFrom(events, '13:10', '13:55'))
    expect(screen.days.flatMap(d => d.events.map(e => e.title))).toEqual(['Quick talk'])
    expect(screen.fitLine).toBe('1 event fits your free time')
  })
  it('names the nearest miss in one plain line when nothing fits', () => {
    const events = [climbing, lunch]
    const screen = discover(events, freeFrom(events, '13:10', '13:55'))
    expect(screen.count).toBe(0)
    expect(screen.fitLine).toBe('Nothing fits. Climbing Club Intro runs 35 min over.')
  })
  it('never counts My Schedule time as free', () => {
    const input = { ...freeFrom([class11, talk], '10:45', '13:55'), plannedIds: ['class'] }
    expect(freeWindows(input).map(w => `${w.start}-${w.end}`)).toEqual(['10:45-11:00', '12:00-13:55'])
  })
})

describe('switching between Busy and Free', () => {
  it('keeps both lists, and each mode filters by its own', () => {
    const events = [climbing, talk, lunch]
    const free = freeFrom(events, '13:10', '13:55')
    const busy = addBusy({ ...free, mode: 'busy', marks: {}, date: DAY }, '12:00', '13:00')!
    const both: MarkInput = { ...free, marks: busy }
    const asFree = discover(events, { ...both, mode: 'free' })
    const asBusy = discover(events, { ...both, mode: 'busy' })
    expect(asFree.days.flatMap(d => d.events.map(e => e.id))).toEqual(['talk'])
    // Busy mode: 12–1 busy leaves 1pm onward free, so climbing and the talk fit; the long lunch does not.
    expect(asBusy.days.flatMap(d => d.events.map(e => e.id))).toEqual(['talk', 'climb'])
    // Switching back and forth changes nothing in either list.
    expect(presentMarks({ ...both, mode: 'free' }).mine.map(r => r.label)).toEqual(['1:10–1:55pm'])
    expect(presentMarks({ ...both, mode: 'busy' }).mine.map(r => r.label)).toEqual(['12–1pm'])
  })
})

describe('five-minute steps', () => {
  it('a drag lands on whole five-minute steps at both edges', () => {
    // A 900px bar for 8am–11pm: one five-minute step is 5px wide.
    const width = 900, left = 100
    const x = (hhmm: string, into = 2.4) => left + cell(hhmm) * (width / ((23 - 8) * 60 / CELL)) + into
    expect(cellAtX(x('13:10'), left, width)).toBe(cell('13:10'))
    expect(cellAtX(x('13:50', 4.9), left, width)).toBe(cell('13:50'))
    const input: MarkInput = { events: [], plannedIds: [], now: NOW, marks: {}, mode: 'free' }
    const open = reshapeBusy({ ...input, date: DAY }, null, cellAtX(x('13:10'), left, width), cellAtX(x('13:50', 4.9), left, width))
    expect(presentMarks({ ...input, open }).mine.map(r => r.label)).toEqual(['1:10–1:55pm'])
  })
  it('a drag past either end of the bar stops at 8am and 11pm', () => {
    expect(cellAtX(-50, 0, 900)).toBe(0)
    expect(cellAtX(2000, 0, 900)).toBe((23 - 8) * 60 / CELL - 1)
  })
})
