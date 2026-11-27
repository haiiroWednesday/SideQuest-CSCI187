import { describe, expect, it } from 'vitest'
import { readIcs, unfold } from '../src/model/icsBusy'
import { checkProposals, rangeOfDays } from '../src/model/busyImport'

const week = rangeOfDays('2026-11-23', 7) // Mon Nov 23 to Sun Nov 29
const cal = (...events: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events, 'END:VCALENDAR'].join('\r\n')
const ev = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n')
const times = (text: string) => readIcs(text, week).proposals.map(p => `${p.date} ${p.start}-${p.end}`)

describe('calendar file (.ics) busy time', () => {
  it('reads a UTC event into campus time', () => {
    // 18:00Z on Nov 24 is 10am Pacific (PST, UTC-8).
    expect(times(cal(ev('UID:a', 'DTSTART:20261124T180000Z', 'DTEND:20261124T190000Z', 'SUMMARY:Lab')))).toEqual(['2026-11-24 10:00-11:00'])
  })
  it('reads TZID and floating times', () => {
    expect(times(cal(
      ev('UID:a', 'DTSTART;TZID=America/New_York:20261125T130000', 'DTEND;TZID=America/New_York:20261125T143000'),
      ev('UID:b', 'DTSTART:20261126T090000', 'DTEND:20261126T093000'),
    ))).toEqual(['2026-11-25 10:00-11:30', '2026-11-26 09:00-09:30'])
  })
  it('expands a weekly class on MWF from September, and stops at UNTIL', () => {
    const cls = ev('UID:c', 'DTSTART;TZID=America/Los_Angeles:20260921T100000', 'DTEND;TZID=America/Los_Angeles:20260921T110000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261127T080000Z', 'SUMMARY:CSCI 187')
    // Friday Nov 27 10am PST is 18:00Z, after UNTIL, so it is not there. The class started in PDT and still reads 10 to 11.
    expect(times(cal(cls))).toEqual(['2026-11-23 10:00-11:00', '2026-11-25 10:00-11:00'])
  })
  it('honours COUNT, INTERVAL and EXDATE', () => {
    expect(times(cal(ev('UID:d', 'DTSTART:20261123T150000', 'DTEND:20261123T160000', 'RRULE:FREQ=DAILY;COUNT=3')))).toEqual(
      ['2026-11-23 15:00-16:00', '2026-11-24 15:00-16:00', '2026-11-25 15:00-16:00'])
    expect(times(cal(ev('UID:e', 'DTSTART:20261116T150000', 'DTEND:20261116T160000', 'RRULE:FREQ=WEEKLY;INTERVAL=2')))).toEqual([])
    expect(times(cal(ev('UID:f', 'DTSTART:20261123T150000', 'DTEND:20261123T160000', 'RRULE:FREQ=DAILY;COUNT=3', 'EXDATE:20261124T150000')))).toEqual(
      ['2026-11-23 15:00-16:00', '2026-11-25 15:00-16:00'])
  })
  it('lets a moved occurrence replace the one it names', () => {
    expect(times(cal(
      ev('UID:g', 'DTSTART:20261123T150000', 'DTEND:20261123T160000', 'RRULE:FREQ=DAILY;COUNT=2'),
      ev('UID:g', 'RECURRENCE-ID:20261124T150000', 'DTSTART:20261124T170000', 'DTEND:20261124T180000'),
    ))).toEqual(['2026-11-23 15:00-16:00', '2026-11-24 17:00-18:00'])
  })
  it('skips cancelled and "show as free" events, and ignores alarms inside an event', () => {
    expect(times(cal(
      ev('UID:h', 'STATUS:CANCELLED', 'DTSTART:20261123T150000', 'DTEND:20261123T160000'),
      ev('UID:i', 'TRANSP:TRANSPARENT', 'DTSTART:20261123T170000', 'DTEND:20261123T180000'),
      ['BEGIN:VEVENT', 'UID:j', 'DTSTART:20261123T120000', 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'DTSTART:19990101T000000', 'END:VALARM', 'DTEND:20261123T130000', 'END:VEVENT'].join('\r\n'),
    ))).toEqual(['2026-11-23 12:00-13:00'])
  })
  it('offers all-day events unticked, and splits an overnight event at midnight', () => {
    const r = readIcs(cal(
      ev('UID:k', 'DTSTART;VALUE=DATE:20261126', 'DTEND;VALUE=DATE:20261128', 'SUMMARY:Thanksgiving break'),
      ev('UID:l', 'DTSTART:20261123T220000', 'DTEND:20261124T010000'),
    ), week).proposals
    expect(r.map(p => `${p.date} ${p.start}-${p.end} ${p.suggested}`)).toEqual([
      '2026-11-23 22:00-23:59 true', '2026-11-24 00:00-01:00 true',
      '2026-11-26 08:00-23:00 false', '2026-11-27 08:00-23:00 false'])
    expect(r[2].label).toBe('Thanksgiving break (all day)')
  })
  it('unfolds long lines and unescapes the title', () => {
    expect(unfold('SUMMARY:Long\r\n  title')).toEqual(['SUMMARY:Long title'])
    expect(readIcs(cal(ev('UID:m', 'DTSTART:20261123T150000', 'DURATION:PT45M', 'SUMMARY:Office hours\\, Prof. K')), week).proposals[0]).toMatchObject({ end: '15:45', label: 'Office hours, Prof. K' })
  })
  it('says so for a file that is not a calendar, or one too big', () => {
    expect(readIcs('hello', week).unclear[0]).toMatch(/not a calendar/)
    expect(readIcs('x'.repeat(2_000_001), week).unclear[0]).toMatch(/too big/)
  })
  it('notes monthly repeats it only read once', () => {
    expect(readIcs(cal(ev('UID:n', 'DTSTART:20261124T150000', 'DTEND:20261124T160000', 'RRULE:FREQ=MONTHLY')), week).unclear[0]).toMatch(/monthly or yearly/)
  })
})

describe('the shared check every busy source passes', () => {
  it('drops malformed, reversed, out-of-range and duplicate stretches', () => {
    const got = checkProposals([
      { date: '2026-11-24', start: '10:00', end: '11:00', label: 'ok', source: 'sentence' },
      { date: '2026-11-24', start: '10:00', end: '11:00', label: 'dup', source: 'ics' },
      { date: '2026-11-24', start: '11:00', end: '10:00', label: 'reversed', source: 'ics' },
      { date: '2026-12-24', start: '10:00', end: '11:00', label: 'later', source: 'ics' },
      { date: '2026-11-24', start: '25:00', end: '26:00', label: 'bad', source: 'ics' },
      { date: '2026-11-24', start: '12:00', end: '13:00', label: 'x', source: 'mars' },
      'nonsense', null,
    ], week)
    expect(got.map(p => p.label)).toEqual(['ok'])
  })
})
