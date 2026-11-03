// Sembiyan: domain rules and real storage boundaries for the local Schedule.
import { describe, expect, it } from 'vitest'
import {
  addPlannedId, canAddPlanCount, eventsOverlap, MAX_PLANNED_EVENTS,
  PLANNED_IDS_KEY, readPlannedIds, removePlannedId, resolvePlannedEvents,
  savePlannedIds, scheduleConflicts,
} from '../src/model/schedule'
import { type CampusEvent } from '../src/model/events'

const event = (id: string, start = '10:00', end = '11:00', date = '2030-11-01'): CampusEvent =>
  ({ id, title: id, location: 'SCU', date, start, end })

describe('personal Schedule Model', () => {
  it('reads a new schedule as empty without writing anything', () => {
    expect(readPlannedIds({ getItem: () => null })).toEqual({ ids: [], blocked: false })
  })
  it('adds once, treats duplicate adds as idempotent, and removes only the chosen identity', () => {
    const original = ['a']
    expect(addPlannedId(original, 'a')).toEqual({ ids: ['a'], added: false, error: null })
    expect(addPlannedId(original, 'b').ids).toEqual(['a', 'b'])
    expect(removePlannedId(['a', 'b'], 'a')).toEqual(['b'])
    expect(removePlannedId(['a'], 'missing')).toEqual(['a'])
    expect(original).toEqual(['a'])
    expect(addPlannedId([], ' ').error).not.toBeNull()
  })
  it('resolves current catalog details, keeps identical titles distinct, sorts across days, and reports missing IDs', () => {
    const catalog = [event('later', '09:00', '10:00', '2030-11-02'), event('b', '12:00', '13:00'), event('a')]
    catalog[1].title = catalog[2].title = 'Same title'
    const ids = ['later', 'b', 'missing', 'a']
    const resolved = resolvePlannedEvents(ids, catalog)
    expect(resolved.events.map(item => item.id)).toEqual(['a', 'b', 'later'])
    expect(resolved.missingIds).toEqual(['missing'])
    catalog[2].location = 'Updated room'
    expect(resolvePlannedEvents(ids, catalog).events[0].location).toBe('Updated room')
    expect(ids).toEqual(['later', 'b', 'missing', 'a'])
    expect(catalog.map(item => item.id)).toEqual(['later', 'b', 'a'])
  })
  it('uses end time then ID to make simultaneous starts deterministic', () => {
    const resolved = resolvePlannedEvents(['b', 'long', 'a'], [event('b'), event('long', '10:00', '12:00'), event('a')])
    expect(resolved.events.map(item => item.id)).toEqual(['a', 'b', 'long'])
  })
  it.each(['{broken', '{}', 'null', '"text"', '[1,null,"a","a",""]'])('preserves damaged storage and blocks changes for %s', raw => {
    const state = readPlannedIds({ getItem: () => raw })
    expect(state.blocked).toBe(true)
    expect(state.ids).toEqual(raw.startsWith('[1') ? ['a'] : [])
  })
  it('handles disabled browser storage and quota failures without throwing', () => {
    expect(readPlannedIds({ getItem: () => { throw Error('denied') } }).blocked).toBe(true)
    expect(savePlannedIds({ setItem: () => { throw Error('quota') } }, ['a'])).toBe(false)
  })
  it('stores IDs alone in a separate key, not event copies or the public catalog', () => {
    const writes: [string, string][] = []
    expect(savePlannedIds({ setItem: (key, value) => { writes.push([key, value]) } }, ['a', 'b'])).toBe(true)
    expect(writes).toEqual([[PLANNED_IDS_KEY, '["a","b"]']])
  })
  it('enforces the team-agreed 100-event limit', () => {
    expect(MAX_PLANNED_EVENTS).toBe(100)
    expect(canAddPlanCount(MAX_PLANNED_EVENTS - 1)).toBe(true)
    for (const count of [MAX_PLANNED_EVENTS, MAX_PLANNED_EVENTS + 1, -1, 1.5, Infinity, NaN]) {
      expect(canAddPlanCount(count)).toBe(false)
    }
    expect(canAddPlanCount(0)).toBe(true)
  })
  it('round-trips and resolves a full 100-event schedule without losing records', () => {
    const catalog = Array.from({ length: MAX_PLANNED_EVENTS }, (_, index) => event(`event-${index}`))
    const ids = catalog.map(item => item.id)
    let saved = ''
    savePlannedIds({ setItem: (_key, value) => { saved = value } }, ids)
    const read = readPlannedIds({ getItem: () => saved })
    expect(read).toEqual({ ids, blocked: false })
    expect(resolvePlannedEvents(read.ids, catalog).events).toHaveLength(MAX_PLANNED_EVENTS)
    expect(scheduleConflicts(catalog).size).toBe(MAX_PLANNED_EVENTS)
  })
})

describe('Schedule overlap warnings', () => {
  it.each([
    ['10:00', '11:00', true], ['10:30', '11:30', true],
    ['09:00', '12:00', true], ['10:15', '10:45', true],
    ['11:00', '12:00', false], ['09:00', '10:00', false],
    ['12:00', '13:00', false], ['11:00', '11:00', false],
    ['23:00', '01:00', false], ['bad', '11:00', false],
  ])('compares 10:00-11:00 with %s-%s as %s', (start, end, expected) => {
    expect(eventsOverlap(event('a'), event('b', start, end))).toBe(expected)
  })
  it('ignores the same identity and events on different dates', () => {
    expect(eventsOverlap(event('a'), event('a'))).toBe(false)
    expect(eventsOverlap(event('a'), event('b', '10:00', '11:00', '2030-11-02'))).toBe(false)
  })
  it('marks every affected event in nested and chained overlaps, without marking adjacent or next-day events', () => {
    const events = [event('outer', '09:00', '14:00'), event('short', '10:00', '11:00'),
      event('nested', '12:00', '13:00'), event('chain', '13:30', '15:00'),
      event('adjacent', '15:00', '16:00'), event('tomorrow', '10:00', '11:00', '2030-11-02')]
    expect([...scheduleConflicts(events).keys()].sort()).toEqual(['chain', 'nested', 'outer', 'short'])
  })
})

it('allows the 100th plan, rejects the 101st, and still permits duplicate checks and removal', () => {
  const initial = Array.from({ length: 99 }, (_, index) => `plan-${index}`)
  const hundredth = addPlannedId(initial, 'last')
  expect(hundredth.added).toBe(true)
  expect(hundredth.ids).toHaveLength(100)
  const overflow = addPlannedId(hundredth.ids, 'extra')
  expect(overflow.added).toBe(false)
  expect(overflow.error).toContain('100-event limit')
  expect(overflow.ids).toEqual(hundredth.ids)
  expect(addPlannedId(hundredth.ids, 'last').error).toBeNull()
  const afterRemoval = removePlannedId(hundredth.ids, 'plan-0')
  expect(addPlannedId(afterRemoval, 'extra').ids).toHaveLength(100)
  expect(initial).toHaveLength(99)
})

it('keeps older over-limit schedules readable so plans can be removed without data loss', () => {
  const ids = Array.from({ length: 101 }, (_, index) => `plan-${index}`)
  const loaded = readPlannedIds({ getItem: () => JSON.stringify(ids) })
  expect(loaded).toEqual({ ids, blocked: false })
  expect(addPlannedId(loaded.ids, 'extra').error).toContain('100-event limit')
  expect(removePlannedId(loaded.ids, 'plan-0')).toHaveLength(100)
})
