import { describe, expect, it } from 'vitest'
import { layoutDayTimeline } from '../src/controller/scheduleTimeline'

const event = (id: string, start: string, end: string) => ({ id, title: id, start, end })

describe('duration-proportional Schedule timeline', () => {
  it('preserves exact minutes and scales 30, 60 and 120-minute events', () => {
    const timeline = layoutDayTimeline([
      event('half-hour', '09:00', '09:30'),
      event('one-hour', '10:00', '11:00'),
      event('two-hour', '12:00', '14:00'),
    ])!
    expect(timeline).toMatchObject({ firstMinute: 540, lastMinute: 840 })
    expect(timeline.items.map(item => item.endMinute - item.startMinute)).toEqual([30, 60, 120])
    expect(timeline.items.map(item => item.laneCount)).toEqual([1, 1, 1])
  })

  it('puts overlapping plans in separate lanes, but reuses lanes for adjacent plans', () => {
    const timeline = layoutDayTimeline([
      event('second', '14:45', '16:15'),
      event('third', '16:15', '17:15'),
      event('first', '14:30', '15:30'),
    ])!
    expect(timeline.items.map(item => [item.id, item.lane, item.laneCount])).toEqual([
      ['first', 0, 2], ['second', 1, 2], ['third', 0, 1],
    ])
  })

  it('assigns separate lanes to nested and equal-start overlaps', () => {
    const timeline = layoutDayTimeline([
      event('c', '15:00', '16:00'),
      event('a', '14:00', '17:00'),
      event('b', '15:00', '16:00'),
    ])!
    expect(timeline.items.map(item => [item.id, item.lane, item.laneCount])).toEqual([
      ['a', 0, 3], ['b', 1, 3], ['c', 2, 3],
    ])
  })

  it('uses whole-hour bounds while retaining actual 09:15–11:15 durations', () => {
    const timeline = layoutDayTimeline([event('late-start', '09:15', '11:15')])!
    expect(timeline).toMatchObject({ firstMinute: 540, lastMinute: 720 })
    expect(timeline.items[0]).toMatchObject({ startMinute: 555, endMinute: 675 })
  })

  it('does not invent a duration for invalid or missing end times', () => {
    expect(layoutDayTimeline([event('unknown', '09:00', '')])).toBeNull()
    const timeline = layoutDayTimeline([
      event('zero', '09:00', '09:00'),
      event('reversed', '12:00', '11:00'),
      event('bad', 'not-time', '15:00'),
      event('valid', '16:00', '16:30'),
    ])!
    expect(timeline.items.map(item => item.id)).toEqual(['valid'])
  })
})
