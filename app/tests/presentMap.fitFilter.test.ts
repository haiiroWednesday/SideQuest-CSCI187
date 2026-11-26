// The campus map's one event filter, "Fits my free time" (Nov 25). Discover no longer has its own
// map: the Map tab is sent every listed event with a `fits` flag, and the Controller says whether
// the filter is offered and how it starts.
import { afterEach, describe, expect, it } from 'vitest'
import { MAP_FITS_ROUTE, fitFilterStart, presentMap, presentMapEvents, readFitChoice, saveFitChoice } from '../src/controller/presentMap'
import { presentDiscover } from '../src/controller/presentDiscover'
import type { CampusEvent } from '../src/controller/postEvent'

// Tuesday 24 November 2026, 10:40 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const ev = (id: string, start: string, end: string, date = DAY): CampusEvent =>
  ({ id, title: `Event ${id}`, hostName: 'Club', date, start, end, location: 'Benson Memorial Center', description: 'x' })
const free = [{ date: DAY, start: '13:00', end: '14:00' }]
const inside = ev('inside', '13:10', '13:50')
const over = ev('over', '13:30', '14:30')
const evening = ev('evening', '19:00', '20:00')
const earlier = ev('earlier', '08:00', '09:00')

afterEach(() => saveFitChoice(null))

describe('fitFilterStart: how "Fits my free time" starts', () => {
  it('is hidden and off without free-time information, whatever else is true', () => {
    expect(fitFilterStart({ hasFreeTime: false, fitCount: 0 })).toEqual({ shown: false, on: false })
    expect(fitFilterStart({ hasFreeTime: false, fitCount: 4, asked: true, choice: true })).toEqual({ shown: false, on: false })
  })
  it('starts on when there is free-time information and at least one event fits', () => {
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 1 })).toEqual({ shown: true, on: true })
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 16 })).toEqual({ shown: true, on: true })
  })
  it('is shown but off when nothing fits, so the map is never empty by default', () => {
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 0 })).toEqual({ shown: true, on: false })
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 0, asked: true })).toEqual({ shown: true, on: false })
  })
  it('keeps the choice the student made earlier this visit', () => {
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 3, choice: false })).toEqual({ shown: true, on: false })
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 0, choice: true })).toEqual({ shown: true, on: true })
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 3, choice: null })).toEqual({ shown: true, on: true })
  })
  it("turns on when the map is opened from Discover's link, even after it was turned off", () => {
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 3, asked: true, choice: false })).toEqual({ shown: true, on: true })
  })
  it('starts off when the map is opened for one venue, so the event you came for is never hidden', () => {
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 3, venueAsked: true })).toEqual({ shown: true, on: false })
    expect(fitFilterStart({ hasFreeTime: true, fitCount: 3, venueAsked: true, choice: true })).toEqual({ shown: true, on: false })
  })
})

describe('the choice on the chip', () => {
  it('is kept in memory for this visit and starts with no choice', () => {
    expect(readFitChoice()).toBeNull()
    saveFitChoice(false)
    expect(readFitChoice()).toBe(false)
    saveFitChoice(true)
    expect(readFitChoice()).toBe(true)
  })
})

describe('presentMapEvents: what the Map tab is sent', () => {
  it('sends every upcoming event, not only the ones that fit, each saying whether it fits', () => {
    const rows = presentMapEvents([inside, over, evening], [], NOW, [], free)
    expect(rows.map(r => [r.id, r.fits])).toEqual([['inside', true], ['over', false], ['evening', false]])
  })
  it('marks nothing as fitting while no free time is known', () => {
    const rows = presentMapEvents([inside, over, evening], [], NOW)
    expect(rows.map(r => r.id)).toEqual(['inside', 'over', 'evening'])
    expect(rows.every(r => r.fits === false)).toBe(true)
  })
  it('agrees with the list Discover shows for the same free time', () => {
    const events = [inside, over, evening, ev('next', '13:00', '14:00', '2026-11-25')]
    const windows = [...free, { date: '2026-11-25', start: '12:00', end: '15:00' }]
    const listed = presentDiscover({ events, now: NOW, freeWindows: windows }).days.flatMap(d => d.events.map(e => e.id))
    expect(presentMapEvents(events, [], NOW, [], windows).filter(r => r.fits).map(r => r.id).sort()).toEqual([...listed].sort())
    expect(listed.sort()).toEqual(['inside', 'next'])
  })
  it('leaves out events that have ended, but keeps your own: posted or in My Schedule', () => {
    expect(presentMapEvents([earlier, inside], [], NOW, [], free).map(r => r.id)).toEqual(['inside'])
    const rows = presentMapEvents([earlier, inside], ['earlier'], NOW, [], free)
    expect(rows.map(r => [r.id, r.planned, r.fits])).toEqual([['earlier', true, false], ['inside', false, true]])
    expect(presentMapEvents([earlier, inside], [], NOW, ['earlier']).map(r => [r.id, r.posted])).toEqual([['earlier', true], ['inside', false]])
  })
  it('still carries the ticket and marker text for each event', () => {
    const [row] = presentMapEvents([inside], [], NOW, [], free)
    expect(row.short).toBe('1:10pm')
    expect(row.when).toBe('Today · 1:10pm–1:50pm')
    expect(row.ticket).toMatchObject({ time: '1:10', ampm: 'pm', day: 'Today' })
  })
})

describe('presentMap: the events and the filter together', () => {
  const input = { events: [inside, over, evening], plannedIds: [], now: NOW }
  it('offers no filter and filters nothing without free-time information', () => {
    const model = presentMap(input)
    expect(model.fit).toEqual({ shown: false, on: false, line: '' })
    expect(model.events).toHaveLength(3)
  })
  it('starts on with the count line Discover uses', () => {
    expect(presentMap({ ...input, free }).fit).toEqual({ shown: true, on: true, line: '1 event fits your free time' })
    const two = presentMap({ ...input, events: [...input.events, ev('b', '13:00', '13:30')], free })
    expect(two.fit.line).toBe('2 events fit your free time')
  })
  it('stays off, and says what nearly fits, when nothing fits', () => {
    const model = presentMap({ ...input, events: [over, evening], free })
    expect(model.fit.shown).toBe(true)
    expect(model.fit.on).toBe(false)
    expect(model.fit.line).toMatch(/^Nothing fits\. Event over /)
  })
  it('passes on where the student came from and what they chose', () => {
    expect(presentMap({ ...input, free, choice: false }).fit.on).toBe(false)
    expect(presentMap({ ...input, free, choice: false, fitAsked: true }).fit.on).toBe(true)
    expect(presentMap({ ...input, free, venueAsked: true }).fit.on).toBe(false)
  })
  it('an empty list of free stretches is still free-time information: the chip shows, off', () => {
    expect(presentMap({ ...input, free: [] }).fit).toMatchObject({ shown: true, on: false })
  })
})

describe("Discover's link to the map", () => {
  it('has its own route, which no venue link can collide with', () => {
    expect(MAP_FITS_ROUTE).toBe('#map-fits')
    expect(MAP_FITS_ROUTE.startsWith('#map/')).toBe(false)
  })
})
