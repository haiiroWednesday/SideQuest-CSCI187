// Host-set tags (free food, guest speaker, off campus, registration needed): model, server and
// the live table before 20261125020000_event_tags.sql is applied.
import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { catalogPostingErrors, createEventCatalog, fromEventRow, isCatalogEvent, type EventDraft, type EventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { createSupabaseEventTable, isMissingTagsColumn } from '../src/model/supabaseEventTable'
import { TAG_ERROR } from '../src/model/eventTags'

const NOW = new Date('2030-11-07T17:00:00Z')
const clock = () => NOW
const draft = (extra: Partial<EventDraft> = {}): EventDraft => ({
  title: 'Pizza and a talk', hostName: 'ACM', description: 'Bring questions.', location: 'SCDI 1308',
  date: '2030-11-14', start: '12:00', end: '13:00', organizer: 'Ana Ruiz', contact: 'acm@scu.edu', spaceConfirmed: true, ...extra,
})

describe('event tags in the catalog model', () => {
  it('stores known tags once each, in list order', async () => {
    const catalog = createEventCatalog(createInMemoryEventTable(), clock)
    const created = await catalog.create(draft({ tags: ['guest-speaker', 'free-food', 'free-food'] as never }))
    expect(created.tags).toEqual(['free-food', 'guest-speaker'])
    expect(isCatalogEvent(created)).toBe(true)
  })
  it('refuses unknown tags for every caller', async () => {
    expect(catalogPostingErrors(draft({ tags: ['pizza'] as never }), NOW).tags).toBe(TAG_ERROR)
    const catalog = createEventCatalog(createInMemoryEventTable(), clock)
    await expect(catalog.create(draft({ tags: 'free-food' as never }))).rejects.toMatchObject({ kind: 'invalid', message: TAG_ERROR })
  })
  it('leaves untagged events exactly as they were, and drops unknown stored tags on read', () => {
    const row: EventRow = { id: '33333333-3333-4333-8333-333333333333', title: 'Old', host_name: 'X', description: '', location: 'Benson',
      event_date: '2030-11-14', start_time: '12:00:00', end_time: '13:00:00' }
    expect(fromEventRow(row)).not.toHaveProperty('tags')
    expect(fromEventRow({ ...row, tags: null })).not.toHaveProperty('tags')
    expect(fromEventRow({ ...row, tags: ['pizza', 'off-campus'] }).tags).toEqual(['off-campus'])
  })
})

describe('live table without the tags column yet', () => {
  const ID = '22222222-2222-4222-8222-222222222222'
  const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  it('recognises only a missing tags column', () => {
    expect(isMissingTagsColumn({ code: '42703', message: 'column events.tags does not exist' })).toBe(true)
    expect(isMissingTagsColumn({ code: 'PGRST204', message: "Could not find the 'tags' column of 'events' in the schema cache" })).toBe(true)
    expect(isMissingTagsColumn({ code: '42703', message: 'column events.contact does not exist' })).toBe(false)
    expect(isMissingTagsColumn({ code: '42501', message: 'permission denied for tags' })).toBe(false)
  })
  it('keeps posting without tags, warning once, even when the access columns are missing too', async () => {
    const bodies: Record<string, unknown>[] = [], selects: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      const select = new URL(request.url).searchParams.get('select') ?? ''
      selects.push(select)
      if (/accessibility/.test(select)) return response({ code: '42703', message: 'column events.accessibility does not exist' }, 400)
      if (/tags/.test(select)) return response({ code: '42703', message: 'column events.tags does not exist' }, 400)
      const body = await request.json() as Record<string, unknown>
      bodies.push(body)
      return response({ ...body, id: ID, start_time: '12:00:00', end_time: '13:00:00' }, 201)
    })
    const warn = vi.fn()
    const catalog = createEventCatalog(createSupabaseEventTable(createClient('https://sidequest-http.test', 'sb_publishable_fixture', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    }), warn), clock)
    const created = await catalog.create(draft({ tags: ['free-food'] }))
    expect(created.id).toBe(ID)
    expect(bodies.at(-1)).not.toHaveProperty('tags')
    expect(selects.at(-1)).not.toMatch(/tags|accessibility/)
    expect(warn.mock.calls.map(call => call[0]).join('\n')).toMatch(/20261125020000_event_tags/)
    expect(warn).toHaveBeenCalledTimes(2)
  })
  it('reads and writes tags once the migration is applied', async () => {
    const selects: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      selects.push(new URL(request.url).searchParams.get('select') ?? '')
      const body = await request.json() as Record<string, unknown>
      return response({ ...body, id: ID, start_time: '12:00:00', end_time: '13:00:00' }, 201)
    })
    const catalog = createEventCatalog(createSupabaseEventTable(createClient('https://sidequest-http.test', 'sb_publishable_fixture', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    }), vi.fn()), clock)
    expect((await catalog.create(draft({ tags: ['registration'] }))).tags).toEqual(['registration'])
    expect(selects[0]).toMatch(/,tags,tags_by$/)
  })
})
