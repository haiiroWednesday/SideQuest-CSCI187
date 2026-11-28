import { describe, expect, it } from 'vitest'
import { readSentence } from '../src/model/busySentence'
import { rangeOfDays } from '../src/model/busyImport'

// Tue Nov 24 2026 to Mon Nov 30.
const week = rangeOfDays('2026-11-24', 7)
const read = (s: string) => readSentence(s, week)
const lines = (s: string) => read(s).proposals.map(p => `${p.date} ${p.start}-${p.end} ${p.label}`)

describe('busy time from a sentence', () => {
  it("reads Cyn's example: three days, a time, and a part of a day", () => {
    expect(lines("I'm busy Mondays, Wednesdays and Fridays from ten to eleven, and I have lab on Thursday afternoon.")).toEqual([
      '2026-11-25 10:00-11:00 Busy', '2026-11-26 12:00-17:00 Lab', '2026-11-27 10:00-11:00 Busy', '2026-11-30 10:00-11:00 Busy'])
  })
  it('reads the short form with day letters and two activities', () => {
    expect(lines('Class MWF ten to eleven, work Tuesday from two to five')).toEqual([
      '2026-11-24 14:00-17:00 Work', '2026-11-25 10:00-11:00 Class', '2026-11-27 10:00-11:00 Class', '2026-11-30 10:00-11:00 Class'])
  })
  it('reads digits, am/pm and dashes', () => {
    expect(lines('gym tues 7-8am')).toEqual(['2026-11-24 07:00-08:00 Gym'])
    expect(lines('Thu 10:30am to 12:15pm seminar')).toEqual(['2026-11-26 10:30-12:15 Seminar'])
    expect(lines('shift saturday 10 to 1')).toEqual(['2026-11-28 10:00-13:00 Shift'])
    expect(lines('practice 6:30 to 8 on TTh')).toEqual(['2026-11-24 18:30-20:00 Practice', '2026-11-26 18:30-20:00 Practice'])
  })
  it('reads today, tomorrow and tonight', () => {
    expect(lines('tomorrow 3 to 4 dentist')).toEqual(['2026-11-25 15:00-16:00 Dentist'])
    expect(lines('busy tonight')).toEqual(['2026-11-24 18:00-23:00 Busy'])
  })
  it('resolves "next Friday" to a date, or says it is too far', () => {
    // Next week starts Mon Nov 30, so next Friday is Dec 4, past the 7 days.
    expect(read('next Friday 2 to 3').proposals).toEqual([])
    expect(read('next Friday 2 to 3').unclear[0]).toMatch(/more than a week away/)
    expect(lines('next Monday 9 to 10 advising')).toEqual(['2026-11-30 09:00-10:00 Advising'])
  })
  it('asks instead of guessing a missing time or end', () => {
    expect(read('lab on Thursday').unclear).toEqual(['What time is lab on Thursday?'])
    expect(read('meeting tomorrow at 3').unclear[0]).toMatch(/^How long is meeting at 3\?/)
    expect(read('meeting tomorrow at 3').proposals).toEqual([])
    expect(read('10 to 11').unclear[0]).toMatch(/^Which day/)
  })
  it('does not read course numbers as times', () => {
    expect(lines('CSCI 187 on Monday 2 to 3')).toEqual(['2026-11-30 14:00-15:00 CSCI 187'])
  })
  it('returns nothing for empty or unrelated text', () => {
    expect(read('').proposals).toEqual([])
    expect(read('hello there').proposals).toEqual([])
  })
})
