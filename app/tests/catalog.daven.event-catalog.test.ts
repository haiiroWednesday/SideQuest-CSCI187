// EventCatalog contract tests. Test owner: Daven.
// Acceptance check from docs/MVP_TEAM_PLAYBOOK.md:
//   "A created event is readable again from shared catalog storage."
import { describe, expect, it } from 'vitest'
import {
  createEventCatalog, campusNow, EventCatalogError, fromEventRow, toEventRow,
  type EventDraft, type EventRow, type EventTable,
} from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'

// 12:00 noon in Santa Clara on 2026-11-03 (PST, UTC-8).
const NOON_NOV_3 = new Date('2026-11-03T20:00:00Z')
const clock = () => NOON_NOV_3

const draft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
  title: 'Photo Walk',
  hostName: 'SCU Photography Club',
  description: 'Bring any camera, phones welcome.',
  location: 'Mission Gardens',
  date: '2026-11-05',
  start: '14:00',
  end: '15:30',
  ...overrides,
})

describe('acceptance: a created event is readable again from catalog storage', () => {
  it('reads the event back through a SEPARATE catalog instance on the same storage', async () => {
    // Two catalogs over one table play the part of two browsers on one
    // database. Reading through the second catalog shows the event came from
    // storage, not from the first catalog's memory.
    const rows = new Map<string, EventRow>()
    const poster = createEventCatalog(createInMemoryEventTable(rows), clock)
    const reader = createEventCatalog(createInMemoryEventTable(rows), clock)

    const created = await poster.create(draft())

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(rows.has(created.id)).toBe(true)
    // Every contract field survives the round trip, hostName included, and
    // the time comes back as "14:00", not Postgres-style "14:00:00".
    expect(await reader.getById(created.id)).toEqual({ id: created.id, ...draft() })
    expect(await reader.listUpcoming()).toEqual([created])
  })
})

describe('EventCatalog.create', () => {
  it('stores trimmed values and lets the store, not the browser, assign IDs', async () => {
    const catalog = createEventCatalog(createInMemoryEventTable(), clock)
    const a = await catalog.create(draft({ title: '  Photo Walk  ', hostName: ' Club ' }))
    const b = await catalog.create(draft()) // same title is fine; the IDs tell them apart

    expect(a.title).toBe('Photo Walk')
    expect(a.hostName).toBe('Club')
    expect(a.id).not.toBe(b.id)
  })

  it.each([
    ['blank title', { title: '   ' }, 'event title'],
    ['blank host name', { hostName: '' }, 'host name'],
    ['blank description', { description: ' ' }, 'description'],
    ['title over 120 characters', { title: 'x'.repeat(121) }, '120 characters'],
    ['impossible date', { date: '2026-02-30' }, 'valid event date'],
    ['end equal to start', { start: '14:00', end: '14:00' }, 'end later'],
    ['end before start (overnight)', { start: '23:00', end: '01:00' }, 'end later'],
    ['malformed time', { start: '9:00' }, 'end later'],
  ])('rejects a %s and stores nothing', async (_label, overrides, message) => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, clock)

    const attempt = catalog.create(draft(overrides))

    await expect(attempt).rejects.toBeInstanceOf(EventCatalogError)
    await expect(attempt).rejects.toMatchObject({ kind: 'invalid', message: expect.stringContaining(message) })
    expect(table.rows.size).toBe(0)
  })

  it('accepts a title of exactly 120 characters (boundary)', async () => {
    const catalog = createEventCatalog(createInMemoryEventTable(), clock)
    await expect(catalog.create(draft({ title: 'x'.repeat(120) }))).resolves.toMatchObject({ title: 'x'.repeat(120) })
  })

  it('does not overwrite an existing event if the store hands out a duplicate ID', async () => {
    const table = createInMemoryEventTable(new Map(), () => '11111111-1111-4111-8111-111111111111')
    const catalog = createEventCatalog(table, clock)
    const first = await catalog.create(draft({ title: 'First' }))

    await expect(catalog.create(draft({ title: 'Second' }))).rejects.toMatchObject({ kind: 'unavailable' })
    expect(await catalog.getById(first.id)).toMatchObject({ title: 'First' })
  })
})

describe('EventCatalog.listUpcoming', () => {
  it('orders by date, then start time, and hides events that already ended (campus time)', async () => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, clock)
    const later = await catalog.create(draft({ title: 'Nov 6', date: '2026-11-06', start: '09:00', end: '10:00' }))
    const afternoon = await catalog.create(draft({ title: 'Nov 5 pm', date: '2026-11-05', start: '15:00', end: '16:00' }))
    const morning = await catalog.create(draft({ title: 'Nov 5 am', date: '2026-11-05', start: '08:00', end: '09:00' }))
    // Existing records were posted earlier, before this fixed clock.
    for (const [id, values] of [
      ['11111111-1111-4111-8111-111111111111', { title: 'Running', date: '2026-11-03', start: '11:30', end: '12:30' }],
      ['22222222-2222-4222-8222-222222222222', { title: 'Ended at noon', date: '2026-11-03', start: '11:00', end: '12:00' }],
      ['33333333-3333-4333-8333-333333333333', { title: 'Yesterday', date: '2026-11-02' }],
    ] as const) table.rows.set(id, { id, ...toEventRow(draft(values)) })

    const titles = (await catalog.listUpcoming()).map(event => event.title)

    expect(titles).toEqual(['Running', morning.title, afternoon.title, later.title])
  })

  it('returns an empty list for an empty catalog', async () => {
    await expect(createEventCatalog(createInMemoryEventTable(), clock).listUpcoming()).resolves.toEqual([])
  })

  it('uses the Santa Clara date, not the UTC date', () => {
    // 05:30 UTC on Nov 4 is still 21:30 on Nov 3 in Santa Clara.
    expect(campusNow(new Date('2026-11-04T05:30:00Z'))).toEqual({ date: '2026-11-03', time: '21:30' })
  })
})

describe('EventCatalog.getById', () => {
  it('returns null for an unknown or malformed ID instead of throwing', async () => {
    const catalog = createEventCatalog(createInMemoryEventTable(), clock)
    await expect(catalog.getById('22222222-2222-4222-8222-222222222222')).resolves.toBeNull()
    await expect(catalog.getById('not-a-uuid')).resolves.toBeNull()
    await expect(catalog.getById('')).resolves.toBeNull()
  })
})

describe('storage failures', () => {
  it('rejects with kind "unavailable" so the UI can show an honest error', async () => {
    const down: EventTable = {
      insert: async () => { throw new Error('fetch failed') },
      selectFromDate: async () => { throw new Error('fetch failed') },
      selectById: async () => { throw new Error('fetch failed') },
    }
    const catalog = createEventCatalog(down, clock)

    await expect(catalog.create(draft())).rejects.toMatchObject({ kind: 'unavailable' })
    await expect(catalog.listUpcoming()).rejects.toMatchObject({ kind: 'unavailable' })
    await expect(catalog.getById('33333333-3333-4333-8333-333333333333')).rejects.toMatchObject({ kind: 'unavailable' })
  })
})

describe('database mapping and configuration', () => {
  it('maps contract fields to SQL column names and back', () => {
    const row = toEventRow(draft())
    expect(row).toEqual({
      title: 'Photo Walk', host_name: 'SCU Photography Club', description: 'Bring any camera, phones welcome.',
      location: 'Mission Gardens', event_date: '2026-11-05', start_time: '14:00', end_time: '15:30',
    })
    expect(fromEventRow({ ...row, id: 'abc', start_time: '14:00:00', end_time: '15:30:00' })).toEqual({ id: 'abc', ...draft() })
  })

  it('returns null instead of a fake catalog when Supabase is not configured', () => {
    expect(createSupabaseEventCatalogFromEnv({})).toBeNull()
    expect(createSupabaseEventCatalogFromEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: '  ' })).toBeNull()
  })
})
