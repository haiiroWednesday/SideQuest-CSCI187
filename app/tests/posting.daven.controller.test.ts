/// <reference types="vite/client" />
// Event posting controller tests. Test owner: Daven.
// Covers the behaviors in docs/MVP_TEAM_PLAYBOOK.md §5 step 7: empty title and
// host name, invalid date, end <= start, duplicate IDs, hostName surviving
// create/read, and server failure. Also checks that the form limits match the
// database migration.
import { describe, expect, it } from 'vitest'
import migrationSql from '../../supabase/migrations/20261103000000_create_events.sql?raw'
import {
  connectEventCatalog, loadPostedEvents, postEvent, postingDraftErrors,
  type EventCatalogPort, type EventDraft,
} from '../src/controller/postEvent'
import { CATALOG_LIMITS, createEventCatalog, EventCatalogError, type EventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { createBrowserEventTable, LOCAL_CATALOG_KEY } from '../src/model/browserEventTable'
import { STORAGE_KEY as M1_STORAGE_KEY } from '../src/model/events'

// 12:00 noon in Santa Clara on 2026-11-03 (PST, UTC-8).
const NOW = new Date('2026-11-03T20:00:00Z')

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

const memoryCatalog = (rows = new Map<string, EventRow>()) =>
  createEventCatalog(createInMemoryEventTable(rows), () => NOW)

describe('postEvent: success and read-back', () => {
  it('posts a valid event, reports its ID, and a fresh client reads it back with hostName', async () => {
    const rows = new Map<string, EventRow>()
    const result = await postEvent(memoryCatalog(rows), draft({ hostName: '  SCU Photography Club ' }), { now: NOW })

    expect(result.status).toBe('posted')
    if (result.status !== 'posted') return
    expect(result.message).toContain(`Event ID: ${result.event.id}`)
    expect(result.message).toContain('shared catalog')
    // A second catalog over the same storage stands in for a new client.
    expect(await memoryCatalog(rows).getById(result.event.id)).toEqual({ ...draft(), id: result.event.id })
  })

  it('posting the same details twice creates two events with different IDs', async () => {
    const catalog = memoryCatalog()
    const a = await postEvent(catalog, draft(), { now: NOW })
    const b = await postEvent(catalog, draft(), { now: NOW })

    if (a.status !== 'posted' || b.status !== 'posted') throw new Error('both posts should succeed')
    expect(a.event.id).not.toBe(b.event.id)
    expect((await catalog.listUpcoming()).map(event => event.id).sort()).toEqual([a.event.id, b.event.id].sort())
  })

  it('says "this browser only" when the catalog is the unshared fallback', async () => {
    const result = await postEvent(memoryCatalog(), draft(), { now: NOW, shared: false })
    expect(result.status === 'posted' && result.message).toContain('this browser only')
  })
})

describe('postEvent: field-level validation (nothing is stored)', () => {
  it.each<[string, Partial<EventDraft>, keyof EventDraft, string]>([
    ['whitespace-only title', { title: '   ' }, 'title', 'event title'],
    ['empty host name', { hostName: '' }, 'hostName', 'host name'],
    ['empty description', { description: '' }, 'description', 'description'],
    ['empty location', { location: ' ' }, 'location', 'location'],
    ['impossible date', { date: '2026-02-30' }, 'date', 'valid event date'],
    ['empty date', { date: '' }, 'date', 'valid event date'],
    ['end equal to start', { start: '14:00', end: '14:00' }, 'end', 'end later'],
    ['end before start', { start: '17:00', end: '16:00' }, 'end', 'end later'],
    ['missing start time', { start: '' }, 'start', 'end later'],
    ['date in the past', { date: '2026-11-02' }, 'date', 'past'],
    ['today, already started', { date: '2026-11-03', start: '11:59', end: '13:00' }, 'start', 'already started'],
  ])('rejects %s on the right field', async (_label, overrides, field, message) => {
    const rows = new Map<string, EventRow>()
    const result = await postEvent(memoryCatalog(rows), draft(overrides), { now: NOW })

    expect(result.status).toBe('invalid')
    if (result.status !== 'invalid') return
    expect(result.fieldErrors[field]).toContain(message)
    expect(rows.size).toBe(0)
  })

  it('reports every invalid field at once, not just the first', () => {
    const errors = postingDraftErrors(draft({ title: '', hostName: ' ', end: '13:00' }), NOW)
    expect(Object.keys(errors).sort()).toEqual(['end', 'hostName', 'title'])
  })

  it('accepts an event today that starts exactly now (boundary)', () => {
    expect(postingDraftErrors(draft({ date: '2026-11-03', start: '12:00', end: '13:00' }), NOW)).toEqual({})
  })

  it('judges "past" on the Santa Clara clock, not UTC', () => {
    // 05:30 UTC on Nov 4 is still 21:30 on Nov 3 on campus, so a 22:00 event on Nov 3 is fine.
    const lateEvening = new Date('2026-11-04T05:30:00Z')
    expect(postingDraftErrors(draft({ date: '2026-11-03', start: '22:00', end: '23:00' }), lateEvening)).toEqual({})
  })
})

describe('form limits match the database migration', () => {
  it.each([
    ['title', 'title'],
    ['hostName', 'host_name'],
    ['description', 'description'],
    ['location', 'location'],
  ] as const)('%s limit equals the CHECK on %s', (field, column) => {
    const check = new RegExp(`length\\(btrim\\(${column}\\)\\) between 1 and (\\d+)`).exec(migrationSql)
    expect(check, `no length CHECK for ${column} in the migration`).not.toBeNull()
    expect(CATALOG_LIMITS[field]).toBe(Number(check![1]))
  })

  it('migration requires start_time < end_time, like the form', () => {
    expect(migrationSql).toContain('check (start_time < end_time)')
  })

  it.each(['title', 'hostName', 'description', 'location'] as const)('%s: accepts the max length, rejects one more', field => {
    const max = CATALOG_LIMITS[field]
    expect(postingDraftErrors(draft({ [field]: 'x'.repeat(max) }), NOW)[field]).toBeUndefined()
    expect(postingDraftErrors(draft({ [field]: 'x'.repeat(max + 1) }), NOW)[field]).toContain(`${max} characters`)
  })
})

describe('server failure', () => {
  const failing = (error: unknown): EventCatalogPort => ({
    create: async () => { throw error },
    listUpcoming: async () => { throw error },
    getById: async () => { throw error },
  })

  it('returns the catalog’s "unavailable" message instead of throwing', async () => {
    const down = failing(new EventCatalogError('unavailable', 'Could not post this event right now.'))
    await expect(postEvent(down, draft(), { now: NOW })).resolves.toEqual({ status: 'failed', error: 'Could not post this event right now.' })
    await expect(loadPostedEvents(down)).resolves.toEqual({ events: [], error: 'Could not post this event right now.' })
  })

  it('uses a generic message for unexpected errors (no internals leak to the UI)', async () => {
    const result = await postEvent(failing(new Error('JWT secret abc123 rejected')), draft(), { now: NOW })
    expect(result).toEqual({ status: 'failed', error: 'Could not post this event right now. Please try again.' })
  })
})

describe('browser-only fallback catalog', () => {
  const fakeStorage = () => {
    const items = new Map<string, string>()
    return { items, getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { items.set(k, v) } }
  }

  it('is used when Supabase env vars are missing, and is labeled not shared', () => {
    expect(connectEventCatalog({}, fakeStorage()).shared).toBe(false)
    expect(connectEventCatalog({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' }, fakeStorage()).shared).toBe(true)
  })

  it('survives a "refresh" (new catalog, same storage) and never touches the M1 key', async () => {
    const storage = fakeStorage()
    const result = await postEvent(createEventCatalog(createBrowserEventTable(storage), () => NOW), draft(), { now: NOW })
    if (result.status !== 'posted') throw new Error('post should succeed')

    const afterRefresh = createEventCatalog(createBrowserEventTable(storage), () => NOW)
    expect(await afterRefresh.getById(result.event.id)).toEqual(result.event)
    expect(storage.items.has(LOCAL_CATALOG_KEY)).toBe(true)
    expect(storage.items.has(M1_STORAGE_KEY)).toBe(false)
  })

  it('reports unreadable saved data as unavailable and does not overwrite it', async () => {
    const storage = fakeStorage()
    storage.items.set(LOCAL_CATALOG_KEY, '{bad json')
    const catalog = createEventCatalog(createBrowserEventTable(storage), () => NOW)

    expect(await postEvent(catalog, draft(), { now: NOW })).toMatchObject({ status: 'failed' })
    expect(await loadPostedEvents(catalog)).toMatchObject({ events: [], error: expect.stringContaining('Could not load') })
    expect(storage.items.get(LOCAL_CATALOG_KEY)).toBe('{bad json')
  })
})
