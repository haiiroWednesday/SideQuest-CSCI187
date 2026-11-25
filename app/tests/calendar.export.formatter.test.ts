// Building an Intl.DateTimeFormat costs about 0.1 ms. googleCalendarDraftUrl used to build two per
// event, so every Discover card paid for them; under a loaded CI machine that pushed App-level
// tests (posting form, storage event, browse detail) past Vitest's 5 s limit.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { googleCalendarDraftUrl } from '../src/controller/calendarExport'

afterEach(() => { vi.restoreAllMocks() })

describe('googleCalendarDraftUrl formatter reuse', () => {
  it('builds at most one campus-time formatter for many links, with the same links', () => {
    const Real = Intl.DateTimeFormat
    let made = 0
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (...args: ConstructorParameters<typeof Real>) {
      made++
      return new Real(...args)
    } as unknown as typeof Real)
    const urls = Array.from({ length: 50 }, (_, i) => googleCalendarDraftUrl({
      id: `e${i}`, title: `Talk ${i}`, description: '', location: 'Benson',
      date: '2026-11-07', start: '14:30', end: '15:30',
    }))
    expect(made).toBeLessThanOrEqual(1)
    expect(new Set(urls.map(u => u && new URL(u).searchParams.get('dates')))).toEqual(new Set(['20261107T223000Z/20261107T233000Z']))
  })

  it('still refuses a spring-forward clock time after the formatter is reused', () => {
    expect(googleCalendarDraftUrl({ id: 'x', title: 'Gap', description: '', location: 'L', date: '2027-03-14', start: '02:30', end: '03:30' })).toBeNull()
    expect(googleCalendarDraftUrl({ id: 'y', title: 'Ok', description: '', location: 'L', date: '2027-03-14', start: '04:00', end: '05:00' })).not.toBeNull()
  })
})
