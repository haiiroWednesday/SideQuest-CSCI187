import { describe, expect, it } from 'vitest'
import { clockLabel, hoursOn, PLACE_HOURS, statusAt, statusNow, type PlaceHours } from '../src/model/placeHours'
import { openIdeaFor, placeHoursLines } from '../src/controller/openNow'
import type { LegacyCampusEvent } from '../src/model/events'

const place = (over: Partial<PlaceHours>): PlaceHours => ({
  id: 'x', name: 'Night Café', kind: 'dining', place: 'Benson', where: 'Benson',
  week: { mon: [['08:00', '10:00'], ['10:00', '14:00']], tue: [['18:00', '02:00']], wed: [], thu: [['09:00', '17:00']] },
  exceptions: [], source: { url: 'https://example.edu', checkedAt: '2026-11-24' }, ...over,
})
const byId = (id: string) => PLACE_HOURS.find(p => p.id === id)!
const at = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

describe('place hours model', () => {
  it('formats clock labels the way the app does', () => {
    expect(clockLabel(0)).toBe('midnight')
    expect(clockLabel(1440)).toBe('midnight')
    expect(clockLabel(720)).toBe('noon')
    expect(clockLabel(at('23:59'))).toBe('11:59pm')
    expect(clockLabel(at('08:30'))).toBe('8:30am')
    expect(clockLabel(1440 + 120)).toBe('2am')
  })
  it('joins back-to-back spans into one opening', () => {
    // 2026-11-30 is a Monday
    expect(statusAt(place({}), '2026-11-30', at('09:00'))).toMatchObject({ state: 'open', label: 'Open until 2pm' })
  })
  it('stays open past midnight and counts the early morning to the day before', () => {
    // Tue 2026-12-01 18:00 to Wed 02:00
    expect(statusAt(place({}), '2026-12-01', at('23:30'))).toMatchObject({ state: 'open', label: 'Open until 2am' })
    expect(statusAt(place({}), '2026-12-02', at('01:15'))).toMatchObject({ state: 'open', label: 'Open until 2am' })
    expect(statusAt(place({}), '2026-12-02', at('02:00')).state).toBe('closed')
  })
  it('says when it opens next, today, tomorrow or on a named day', () => {
    expect(statusAt(place({}), '2026-11-30', at('07:00')).label).toBe('Closed, opens 8am')
    expect(statusAt(place({}), '2026-11-30', at('15:00')).label).toBe('Closed, opens tomorrow 6pm')
    // Wed is closed all day, Thu opens at 9
    expect(statusAt(place({}), '2026-12-02', at('10:00')).label).toBe('Closed, opens tomorrow 9am')
  })
  it('never guesses: a day with no posted hours is unknown, and closed days stop at it', () => {
    // Fri is missing from the week
    expect(statusAt(place({}), '2026-12-04', at('12:00'))).toMatchObject({ state: 'unknown', label: 'Hours not posted' })
    expect(statusAt(place({}), '2026-12-03', at('18:00')).label).toBe('Closed. Next hours not posted')
  })
  it('lets holidays override the week, and marks contradictory days unclear', () => {
    const p = place({ exceptions: [
      { from: '2026-11-30', to: '2026-11-30', hours: [], note: 'Closed for a holiday' },
      { from: '2026-12-03', to: '2026-12-03', unclear: true, note: 'Two pages disagree' }] })
    expect(hoursOn(p, '2026-11-30')).toMatchObject({ kind: 'hours', spans: [] })
    expect(statusAt(p, '2026-11-30', at('09:00')).state).toBe('closed')
    expect(statusAt(p, '2026-12-03', at('10:00'))).toMatchObject({ state: 'unclear', label: 'Hours unclear today' })
  })
  it('reads the Santa Clara clock, whatever the machine time zone', () => {
    // 2026-11-24 04:30 UTC is 8:30pm on Monday the 23rd in Santa Clara (PST, UTC-8)
    const malley = byId('malley')
    expect(statusNow(malley, new Date('2026-11-24T04:30:00Z')).state).toBe('closed')
    // 2026-11-24 21:00 UTC is 1pm Tuesday the 24th: Malley's break hours are noon to 4
    expect(statusNow(malley, new Date('2026-11-24T21:00:00Z'))).toMatchObject({ state: 'open', label: 'Open until 4pm' })
  })
  it('uses the hours SCU published (checked 2026-11-24)', () => {
    // A normal Tuesday after the break: Dec 1
    expect(statusAt(byId('cellar'), '2026-12-01', at('21:00')).label).toBe('Open until 11:59pm')
    expect(statusAt(byId('malley'), '2026-12-01', at('22:00')).label).toBe('Open until midnight')
    expect(statusAt(byId('sunstream'), '2026-11-25', at('12:00')).label).toBe('Closed, opens Mon 8:30am')
    expect(statusAt(byId('mission-bakery'), '2026-11-24', at('12:00')).state).toBe('unclear')
    // Sunstream has no posted Saturday hours
    expect(statusAt(byId('sunstream'), '2026-12-05', at('12:00')).state).toBe('unknown')
    for (const p of PLACE_HOURS) {
      const spans = [...Object.values(p.week), ...p.exceptions.map(e => e.hours ?? [])].flat()
      for (const [a, b] of spans) { expect(a).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/); expect(b).toMatch(/^([01]\d|2[0-4]):[0-5]\d$/) }
      expect(p.source.url).toMatch(/^https:\/\/(www\.)?scu(dining\.cafebonappetit)?\.(edu|com)\//)
      expect(p.source.checkedAt).toBe('2026-11-24')
    }
  })
})

const ev = (id: string, location: string, date: string, start: string, end: string): LegacyCampusEvent =>
  ({ id, title: id, hostName: 'Host', description: '', location, date, start, end } as LegacyCampusEvent)

describe('open-now ideas for a free stretch', () => {
  const tue = '2026-12-01'
  it('suggests the closest open place from your previous plan, with a walk estimate', () => {
    const idea = openIdeaFor({ date: tue, start: '14:00', end: '15:30' }, {
      events: [ev('seminar', 'Kenna Hall 104', tue, '12:00', '14:00')], plannedIds: ['seminar'] })
    expect(idea).not.toBeNull()
    expect(idea!.text).toMatch(/^[\w é]+ is open until [\w:]+, \d+ min walk$/)
    expect(idea!.walkMinutes).toBeGreaterThan(0)
  })
  it('says "in the same building" instead of a 0 min walk', () => {
    const idea = openIdeaFor({ date: tue, start: '13:00', end: '14:00' }, {
      events: [ev('talk', 'Benson Parlor BC', tue, '12:00', '13:00')], plannedIds: ['talk'] })
    expect(idea!.text).toMatch(/ is open until [\w:]+, in the same building$/)
  })
  it('without a previous plan it names the building instead of a walk', () => {
    const idea = openIdeaFor({ date: tue, start: '21:00', end: '22:30' }, { events: [], plannedIds: [] })
    expect(idea!.text).toMatch(/ in \w+ is open until /)
    expect(idea!.walkMinutes).toBeNull()
  })
  it('never suggests a place whose hours are unknown or unclear', () => {
    // Nov 24 evening: Malley closed at 4, Mission Bakery and The Cellar unclear, the rest closed for the break.
    expect(openIdeaFor({ date: '2026-11-24', start: '20:00', end: '22:00' }, { events: [], plannedIds: [] })).toBeNull()
  })
  it('skips places closing before they are useful, and stretches that already passed', () => {
    const idea = openIdeaFor({ date: tue, start: '16:45', end: '18:00' }, { events: [], plannedIds: [] })
    expect(idea?.name).not.toBe('Fresh Bytes') // closes at 5, only 15 minutes away
    expect(openIdeaFor({ date: tue, start: '14:00', end: '15:00' }, { events: [], plannedIds: [], now: new Date('2026-12-02T20:00:00Z') })).toBeNull()
  })
  it('lists every venue in a map place with its own status', () => {
    const lines = placeHoursLines('Benson', new Date('2026-12-01T20:00:00Z')) // Tue noon
    expect(lines.map(l => l.name)).toEqual(['Marketplace', 'Mission Bakery', 'The Cellar'])
    expect(lines.every(l => l.state === 'open')).toBe(true)
  })
})
