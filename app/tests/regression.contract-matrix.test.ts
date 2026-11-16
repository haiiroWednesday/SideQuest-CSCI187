import { describe, expect, it, vi } from 'vitest'
import {
  CATALOG_LIMITS, catalogDraftErrors, catalogPostingErrors, compareEvents,
  createEventCatalog, firstFieldError, isUpcoming, isCatalogEvent,
  type CampusEvent, type EventDraft, type EventTable,
} from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { fitsFully } from '../src/model/events'
import {
  addPlannedId, isScheduleEvent, MAX_PLANNED_EVENTS, readPlannedIds,
  removePlannedId, resolvePlannedEvents, scheduleConflicts,
} from '../src/model/schedule'
import { presentDiscover, presentSchedule } from '../src/controller/presentScreens'

const NOW = new Date('2030-11-07T17:00:00Z') // 09:00 on Nov 7 in Santa Clara.
const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'
const ID_C = '33333333-3333-4333-8333-333333333333'
const draft = (patch: Partial<EventDraft> = {}): EventDraft => ({
  title: 'Art Workshop', hostName: 'SCU Art Club', description: 'Bring a notebook.',
  location: 'Benson Center', date: '2030-11-08', start: '14:30', end: '15:30',
  ...patch,
})
const event = (patch: Partial<CampusEvent> = {}): CampusEvent => ({ id: ID_A, ...draft(), ...patch })
const ids = (items: readonly { id: string }[]) => items.map(item => item.id)

describe('REG-POST: field partitions and Model-level posting', () => {
  it.each([
    'title', 'hostName', 'description', 'location',
  ] as const)('rejects missing or whitespace-only %s, without relying on browser required', field => {
    const errors = catalogDraftErrors(draft({ [field]: '  \n ' }))
    expect(errors[field]).toMatch(/Please enter/)
    expect(firstFieldError(errors)).toBeTruthy()
  })

  it.each([
    ['title', CATALOG_LIMITS.title],
    ['hostName', CATALOG_LIMITS.hostName],
    ['description', CATALOG_LIMITS.description],
    ['location', CATALOG_LIMITS.location],
  ] as const)('%s accepts the exact maximum %i and rejects one character more', (field, max) => {
    expect(catalogDraftErrors(draft({ [field]: 'x'.repeat(max) }))[field]).toBeUndefined()
    expect(catalogDraftErrors(draft({ [field]: 'x'.repeat(max + 1) }))[field])
      .toContain(String(max))
  })

  it.each(['2030-02-29', '2030-11-31', '2030-13-07', '2030-11-7', 'hello'])(
    'rejects the impossible/noncanonical date %s', date => {
      expect(catalogDraftErrors(draft({ date })).date).toMatch(/valid event date/)
    },
  )

  it.each([
    [{ start: '15:30', end: '15:30' }, 'end'],
    [{ start: '16:00', end: '15:30' }, 'end'],
    [{ start: '23:45', end: '00:15' }, 'end'],
    [{ start: '24:00', end: '24:30' }, 'start'],
    [{ start: '14:3', end: '15:30' }, 'start'],
    [{ start: '14:30', end: '15:60' }, 'end'],
  ] as const)('rejects the invalid or overnight clock interval %j', (times, field) => {
    const errors = catalogDraftErrors(draft(times))
    expect(errors[field]).toContain('later than it starts')
  })

  it.each([
    [{ date: '2030-11-06' }, 'date'],
    [{ date: '2031-11-08' }, 'date'],
    [{ date: '2030-11-07', start: '08:59' }, 'start'],
  ] as const)('rejects posting out of allowed date/time horizon: %j', (patch, field) => {
    expect(catalogPostingErrors(draft(patch), NOW)[field]).toBeTruthy()
  })

  it.each([
    { date: '2030-11-07', start: '09:00', end: '09:01' },
    { date: '2030-11-07', start: '09:01', end: '10:00' },
    { date: '2031-11-07', start: '14:30', end: '15:30' },
  ])('accepts the exact present-minute and one-year posting boundaries: %j', patch => {
    expect(catalogPostingErrors(draft(patch), NOW)).toEqual({})
  })

  it('validates before any storage write and preserves the original invalid draft', async () => {
    const insert = vi.fn()
    const table: EventTable = { insert, selectFromDate: vi.fn(), selectById: vi.fn() }
    const catalog = createEventCatalog(table, () => NOW)
    const invalid = draft({ title: ' ', date: '2030-11-06' })
    const original = structuredClone(invalid)
    await expect(catalog.create(invalid)).rejects.toMatchObject({ kind: 'invalid' })
    expect(invalid).toEqual(original)
    expect(insert).not.toHaveBeenCalled()
  })

  it('trims public records once at the catalog boundary, then reads them unchanged', async () => {
    const table = createInMemoryEventTable(new Map(), () => ID_A)
    const catalog = createEventCatalog(table, () => NOW)
    const submitted = draft({
      title: '  Art Workshop  ', hostName: ' SCU Club ',
      location: '  Library  ', description: ' Bring paper.  ',
    })
    const original = { ...submitted }
    const created = await catalog.create(submitted)
    expect(created).toMatchObject({
      id: ID_A, title: 'Art Workshop', hostName: 'SCU Club',
      location: 'Library', description: 'Bring paper.',
    })
    expect(submitted).toEqual(original)
    expect(table.rows.get(ID_A)).toMatchObject({
      title: 'Art Workshop', host_name: 'SCU Club', start_time: '14:30:00',
    })
    expect(await catalog.getById(ID_A)).toEqual(created)
    expect(ids(await catalog.listUpcoming())).toEqual([ID_A])
  })

  it('keeps duplicate titles as separate event identities and sorts tied dates/times by ID', async () => {
    const newIds = [ID_B, ID_A]
    const table = createInMemoryEventTable(new Map(), () => newIds.shift()!)
    const catalog = createEventCatalog(table, () => NOW)
    await catalog.create(draft())
    await catalog.create(draft())
    expect(ids(await catalog.listUpcoming())).toEqual([ID_A, ID_B])
    expect(table.rows.size).toBe(2)
  })

  it('never queries the adapter for malformed IDs or trusts a malformed catalog row', async () => {
    const selectById = vi.fn(async () => null)
    const table: EventTable = {
      insert: vi.fn(), selectFromDate: vi.fn(async () => []), selectById,
    }
    const catalog = createEventCatalog(table, () => NOW)
    await expect(catalog.getById('not-a-uuid')).resolves.toBeNull()
    expect(selectById).not.toHaveBeenCalled()
    expect(isCatalogEvent({ ...event(), id: '', title: 'Workshop' })).toBe(false)
    expect(isCatalogEvent({ ...event(), end: '14:30' })).toBe(false)
  })
})

describe('REG-DISCOVER: calendar, time, filter and state transitions', () => {
  it.each([
    ['2030-11-06', '15:30', false],
    ['2030-11-07', '09:00', false],
    ['2030-11-07', '09:01', true],
    ['2030-11-08', '00:01', true],
  ] as const)('treats date %s and end %s as upcoming = %s', (date, end, expected) => {
    expect(isUpcoming(event({ date, start: '08:00', end }), NOW)).toBe(expected)
  })

  it.each([
    ['14:30', '15:30', true],
    ['14:29', '15:30', true],
    ['14:30', '15:31', true],
    ['14:31', '15:30', false],
    ['14:30', '15:29', false],
    ['14:45', '15:15', false],
    ['16:00', '17:00', false],
  ] as const)('includes event 14:30-15:30 in free window %s-%s = %s', (start, end, fit) => {
    expect(fitsFully(event(), '2030-11-08', start, end)).toBe(fit)
  })

  it('rejects mismatched dates and invalid free-time windows without an accidental match', () => {
    const item = event()
    for (const [date, start, end] of [
      ['2030-11-09', '14:00', '16:00'], ['2030-11-08', '15:00', '14:00'],
      ['2030-11-08', '14:00', '14:00'], ['2030-11-08', 'bad', '16:00'],
    ]) expect(fitsFully(item, date, start, end)).toBe(false)
  })

  it('does not mutate input order, merges equal titles or count incomplete filters as active', () => {
    const later = event({ id: ID_B, date: '2030-11-09', start: '10:00', end: '11:00' })
    const earlier = event({ id: ID_A, title: 'Same title', date: '2030-11-08' })
    const input = [later, earlier]
    const partial = presentDiscover({
      events: input, now: NOW,
      freeWindow: { date: '2030-11-08', start: '14:00', end: '' },
    })
    expect(partial.status).toBe('ready')
    expect(partial.count).toBe(2)
    expect(partial.freeWindow).toMatchObject({ active: false, canClear: true, fitCount: null })
    expect(partial.days.map(day => day.date)).toEqual(['2030-11-08', '2030-11-09'])
    expect(input).toEqual([later, earlier])
    expect(compareEvents(earlier, later)).toBeLessThan(0)
  })

  it('distinguishes a zero-match search from empty catalog, read error and loading', () => {
    const freeWindow = { date: '2030-11-08', start: '16:00', end: '17:00' }
    const noFit = presentDiscover({ events: [event()], now: NOW, freeWindow })
    expect(noFit.status).toBe('ready')
    expect(noFit.count).toBe(0)
    expect(noFit.freeWindow).toMatchObject({ active: true, fitCount: 0, fitText: 'Nothing fits' })
    expect(presentDiscover({ events: [], now: NOW }).status).toBe('empty')
    expect(presentDiscover({ events: [], now: NOW, loading: true }).status).toBe('loading')
    const failure = presentDiscover({ events: [], now: NOW, error: 'Catalog offline' })
    expect(failure).toMatchObject({ status: 'error', errorMessage: 'Catalog offline' })
  })

  it('shows input validation without filtering the catalog on an invalid window', () => {
    const output = presentDiscover({
      events: [event()], now: NOW,
      freeWindow: { date: '2030-11-08', start: '16:00', end: '14:00' },
    })
    expect(output.status).toBe('ready')
    expect(output.count).toBe(1)
    expect(output.freeWindow).toMatchObject({ active: false, fitCount: null })
    expect(output.freeWindow?.error).toMatch(/end time later/)
  })
})

describe('REG-SCHEDULE: identity, damaged persistence, overlaps and history', () => {
  it.each(['{', '{}', 'null', '7', '"a"', '[null,"a","a"]'])(
    'does not silently repair damaged plan storage (%s)', raw => {
      const value = readPlannedIds({ getItem: () => raw })
      expect(value.blocked).toBe(true)
      expect(value.ids).toEqual(raw.startsWith('[null') ? ['a'] : [])
    },
  )

  it('preserves an over-limit history and allows remove, but blocks the next new plan', () => {
    const old = Array.from({ length: MAX_PLANNED_EVENTS + 1 }, (_, index) => 'event-' + index)
    const loaded = readPlannedIds({ getItem: () => JSON.stringify(old) })
    expect(loaded).toEqual({ ids: old, blocked: false })
    expect(addPlannedId(loaded.ids, 'new').error).toMatch(/100-event limit/)
    expect(addPlannedId(loaded.ids, 'event-0').error).toBeNull()
    const reduced = removePlannedId(loaded.ids, 'event-0')
    expect(reduced).toHaveLength(100)
    expect(addPlannedId(reduced, 'new').error).toMatch(/100-event limit/)
    expect(addPlannedId(reduced.slice(1), 'new').added).toBe(true)
    expect(old).toHaveLength(101)
  })

  it('never merges two saved events solely because they have the same title', () => {
    const a = event({ title: 'Same Title', id: ID_A })
    const b = event({ title: 'Same Title', id: ID_B, start: '16:00', end: '17:00' })
    const resolved = resolvePlannedEvents([ID_B, ID_A, ID_C], [a, b])
    expect(ids(resolved.events)).toEqual([ID_A, ID_B])
    expect(resolved.missingIds).toEqual([ID_C])
    expect(a.title).toBe(b.title)
  })

  it('keeps a past plan and the currently active next plan in separate groups', () => {
    const ended = event({ id: ID_A, date: '2030-11-06' })
    const future = event({ id: ID_B, date: '2030-11-08' })
    const display = presentSchedule({
      ids: [ID_A, ID_B], missingIds: [], entries: [
        { event: ended, conflict: null }, { event: future, conflict: null },
      ],
    }, NOW)
    expect(display.status).toBe('ready')
    expect(display.plannedCount).toBe(2)
    expect(display.done.map(item => item.id)).toEqual([ID_A])
    expect(display.nextUp?.stub.id).toBe(ID_B)
    expect(display.days.flatMap(day => day.events.map(item => item.id))).toEqual([ID_B])
  })

  it('recognizes nested conflicts, but excludes adjacent and different-day events', () => {
    const outer = event({ id: ID_A, start: '09:00', end: '12:00' })
    const nested = event({ id: ID_B, start: '10:00', end: '11:00' })
    const adjacent = event({ id: ID_C, start: '12:00', end: '13:00' })
    const nextDay = event({ id: 'next', date: '2030-11-09', start: '10:00', end: '11:00' })
    expect([...scheduleConflicts([outer, nested, adjacent, nextDay]).keys()].sort()).toEqual([ID_A, ID_B])
  })

  it('preserves older public records with valid legacy-length fields on saved plans', () => {
    const long = event({
      title: 'T'.repeat(CATALOG_LIMITS.title), hostName: 'H'.repeat(CATALOG_LIMITS.hostName),
      location: 'L'.repeat(CATALOG_LIMITS.location),
      description: 'D'.repeat(CATALOG_LIMITS.description),
    })
    expect(isScheduleEvent(long)).toBe(true)
    expect(resolvePlannedEvents([ID_A], [long]).events[0]).toEqual(long)
    expect(isScheduleEvent({ ...long, description: 'D'.repeat(CATALOG_LIMITS.description + 1) })).toBe(false)
  })
})
