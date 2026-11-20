import { describe, expect, it } from 'vitest'
import { googleCalendarDraftUrl, CAMPUS_TIME_ZONE } from '../src/controller/calendarExport'

const event = {
  id: 'evt-1', title: 'Jazz & Poetry 夜',
  description: 'Meet musicians & poets. Bring a notebook.',
  location: 'Santa Clara University, Music Hall',
  date: '2026-11-20', start: '14:30', end: '15:30',
}

describe('Google Calendar draft export with California time', () => {
  it('uses actual California winter time and properly encodes Unicode fields', () => {
    const raw = googleCalendarDraftUrl(event)
    expect(raw).not.toBeNull()
    const url = new URL(raw!)
    expect(url.origin).toBe('https://calendar.google.com')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('dates')).toBe('20261120T223000Z/20261120T233000Z')
    expect(url.searchParams.get('stz')).toBe(CAMPUS_TIME_ZONE)
    expect(url.searchParams.get('etz')).toBe(CAMPUS_TIME_ZONE)
    expect(url.searchParams.get('text')).toBe(event.title)
    expect(url.searchParams.get('details')).toBe(event.description)
    expect(url.searchParams.get('location')).toBe(event.location)
    expect(event.start).toBe('14:30') // read-only, no mutation
  })
  it('uses Pacific daylight time in summer, independent of the computer timezone', () => {
    const url = new URL(googleCalendarDraftUrl({ ...event, date: '2026-07-17', start: '18:00', end: '19:15' })!)
    expect(url.searchParams.get('dates')).toBe('20260718T010000Z/20260718T021500Z')
  })
  it('refuses ambiguous or nonexistent clocks around daylight-saving transitions', () => {
    expect(googleCalendarDraftUrl({ ...event, date: '2026-03-08', start: '02:30', end: '03:30' })).toBeNull()
    expect(googleCalendarDraftUrl({ ...event, date: '2026-11-01', start: '01:15', end: '02:15' })).toBeNull()
  })
  it('does not fabricate an end time or duration when records are invalid', () => {
    expect(googleCalendarDraftUrl({ ...event, end: '' })).toBeNull()
    expect(googleCalendarDraftUrl({ ...event, end: '14:30' })).toBeNull()
    expect(googleCalendarDraftUrl({ ...event, end: '13:30' })).toBeNull()
    expect(googleCalendarDraftUrl({ ...event, date: '2026-02-30' })).toBeNull()
    expect(googleCalendarDraftUrl({ ...event, title: '    ' })).toBeNull()
  })
})
