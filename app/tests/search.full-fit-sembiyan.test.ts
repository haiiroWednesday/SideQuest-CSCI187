// Sembiyan: inclusive containment is different from merely touching a window.
import { describe, expect, it } from 'vitest'
import { findEvents, type CampusEvent } from '../src/controller/findEvents'
const date = '2030-11-01'
const event = (id: string, start: string, end: string, eventDate = date): CampusEvent =>
  ({ id, title: id, location: 'SCU', date: eventDate, start, end })

describe('availability full-fit matching', () => {
  it.each([
    ['10:00', '12:00', true], ['10:00', '11:00', true], ['11:00', '12:00', true],
    ['10:01', '11:59', true], ['09:59', '11:00', false], ['11:00', '12:01', false],
    ['09:00', '13:00', false], ['12:00', '13:00', false], ['09:00', '10:00', false],
    ['12:00', '12:00', false], ['11:00', '10:00', false], ['bad', '11:00', false],
  ])('matches event %s-%s against 10:00-12:00 as %s', (start, end, expected) => {
    expect(findEvents([event('test', start, end)], date, '10:00', '12:00').matches.length).toBe(expected ? 1 : 0)
  })
  it('handles midnight, final minute, and one-minute windows', () => {
    expect(findEvents([event('midnight', '00:00', '00:01')], date, '00:00', '00:01').matches).toHaveLength(1)
    expect(findEvents([event('late', '23:58', '23:59')], date, '23:58', '23:59').matches).toHaveLength(1)
    expect(findEvents([event('overnight', '23:00', '01:00')], date, '00:00', '23:59').matches).toEqual([])
  })
  it('requires the same valid calendar date, including leap-day correctness', () => {
    expect(findEvents([event('other-day', '10:00', '11:00', '2030-11-02')], date, '10:00', '12:00').matches).toEqual([])
    expect(findEvents([event('leap', '10:00', '11:00', '2032-02-29')], '2032-02-29', '10:00', '12:00').matches).toHaveLength(1)
    expect(findEvents([], '2030-02-29', '10:00', '12:00').error).not.toBeNull()
  })
  it.each([['', '12:00'], ['10:00', ''], ['12:00', '10:00'], ['12:00', '12:00'], ['24:00', '25:00']])('rejects invalid window %s-%s', (start, end) => {
    const result = findEvents([event('test', '10:00', '11:00')], date, start, end)
    expect(result.error).not.toBeNull()
    expect(result.matches).toEqual([])
  })
  it('returns empty results for no matches and sorts matches without mutating the catalog', () => {
    const catalog = [event('late', '11:00', '12:00'), event('early', '10:00', '11:00')]
    expect(findEvents(catalog, date, '10:00', '12:00').matches.map(item => item.id)).toEqual(['early', 'late'])
    expect(catalog.map(item => item.id)).toEqual(['late', 'early'])
    expect(findEvents([], date, '10:00', '12:00')).toEqual({ matches: [], error: null })
  })
})
