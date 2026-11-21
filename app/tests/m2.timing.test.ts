import { describe, expect, it } from 'vitest'
import { describeDay, presentDiscover, presentSchedule } from '../src/controller/presentScreens'
import { eventPhase, initialCampusWindow } from '../src/model/eventTiming'
import { scheduleConflicts } from '../src/model/schedule'

const event = (id: string, start: string, end: string, date = '2030-11-07') => ({
  id,
  title: id,
  location: 'Library',
  date,
  start,
  end,
})
describe('California time and disjoint overlaps', () => {
  it('uses the campus day when UTC and the device day differ', () => {
    const now = new Date('2030-11-08T04:00:00Z') // Nov 7, 8pm in California
    expect(describeDay('2030-11-07', now).tag).toBe('TODAY')
    expect(describeDay('2030-11-08', now).tag).toBe('TOMORROW')
    expect(initialCampusWindow(now)).toEqual({ date: '2030-11-07', start: '20:30', end: '21:30' })
    expect(initialCampusWindow(new Date('2030-11-08T07:50:00Z'))).toEqual({
      date: '2030-11-08',
      start: '14:30',
      end: '15:30',
    })
  })
  it('keeps calendar-day labels correct across both DST transitions', () => {
    expect(describeDay('2030-03-11', new Date('2030-03-10T20:00:00Z')).tag).toBe('TOMORROW')
    expect(describeDay('2030-11-04', new Date('2030-11-03T20:00:00Z')).tag).toBe('TOMORROW')
  })
  it('agrees at the exact start and end boundaries across Discover and Schedule', () => {
    const e = event('a', '14:30', '15:30')
    const input = { ids: ['a'], entries: [{ event: e, conflict: null }], missingIds: [] }
    const start = new Date('2030-11-07T14:30:00-08:00'),
      end = new Date('2030-11-07T15:30:00-08:00')
    expect(eventPhase(e, start)).toBe('live')
    expect(presentDiscover({ events: [e], now: start }).count).toBe(1)
    expect(eventPhase(e, end)).toBe('ended')
    expect(presentDiscover({ events: [e], now: end }).count).toBe(0)
    expect(presentSchedule(input, end).done.map(e => e.id)).toEqual(['a'])
  })
  it('describes separate morning and afternoon conflicts without inventing an all-day overlap', () => {
    const events = [
      event('a', '09:00', '10:00'),
      event('b', '09:30', '10:30'),
      event('c', '15:00', '16:00'),
      event('d', '15:30', '16:30'),
    ]
    const conflicts = scheduleConflicts(events)
    const screen = presentSchedule(
      {
        ids: events.map(e => e.id),
        entries: events.map(event => ({ event, conflict: conflicts.get(event.id) ?? null })),
        missingIds: [],
      },
      new Date('2030-11-07T08:00:00-08:00'),
    )
    expect(screen.days[0].overlapNote).toBe('4 plans have conflicts')
    expect(screen.days[0].events.map(e => e.overlap?.text)).toEqual([
      'Overlaps b by 30 min',
      'Overlaps a by 30 min',
      'Overlaps d by 30 min',
      'Overlaps c by 30 min',
    ])
  })
})
