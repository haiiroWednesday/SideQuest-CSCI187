// SCU posting policy (scu.edu/csi/organizations/resources/advertising): every new event names
// its primary student organizer and their email or phone, carries the Access Policy Statement
// word for word, and has its room or space confirmed. Older events without them still load.
// The server keeps posting while the live table has not had the migration yet.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACCESS_POLICY_ON } from '../src/model/eventCatalog'
import { createServer, type Server } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import {
  ACCESS_LIMITS, accessStatement, catalogPostingErrors, createEventCatalog, fromEventRow, isCatalogEvent, toEventRow,
  type EventDraft, type EventRow,
} from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { createSupabaseEventTable, isMissingAccessColumn } from '../src/model/supabaseEventTable'
import { createCatalogApi } from '../server/api'
import { campusDateFromToday } from './fixtures/campusDates'
import { presentBrowseDetail } from '../src/controller/screenModels'

const NOW = new Date('2030-11-07T17:00:00Z')
const clock = () => NOW
const STATEMENT = 'In compliance with the ADA/504, please direct your accommodation requests to Ana Ruiz at ana@scu.edu.'
const draft = (extra: Partial<EventDraft> = {}): EventDraft => ({
  title: 'Photo Walk', hostName: 'Art Club', description: 'Bring a camera.', location: 'Library',
  date: '2030-11-14', start: '14:30', end: '15:30', organizer: 'Ana Ruiz', contact: 'ana@scu.edu', spaceConfirmed: true, ...extra,
})

// The SCU ADA/504 rule is switched off (ACCESS_POLICY_ON, Cyn Nov 24). These run again if it is switched on.
describe.runIf(ACCESS_POLICY_ON)('posting rule (model)', () => {
  it('builds SCU\'s statement word for word from the organizer and contact', () => {
    expect(accessStatement(' Ana Ruiz ', ' ana@scu.edu ')).toBe(STATEMENT)
    expect(toEventRow(draft()).accessibility).toBe(STATEMENT)
    // Wording supplied by a caller is never kept: it is rebuilt from organizer and contact.
    expect(toEventRow(draft({ accessibility: 'Email Ana.' })).accessibility).toBe(STATEMENT)
  })
  it('accepts an email or a phone number as the contact', () => {
    expect(catalogPostingErrors(draft(), NOW)).toEqual({})
    expect(catalogPostingErrors(draft({ contact: '(408) 554-4000' }), NOW)).toEqual({})
    expect(catalogPostingErrors(draft({ contact: '+1 408 554 4000' }), NOW)).toEqual({})
  })
  it('requires the organizer, the contact and the space confirmation on every new post', () => {
    const { organizer: _o, contact: _c, spaceConfirmed: _s, ...bare } = draft()
    const errors = catalogPostingErrors(bare as EventDraft, NOW)
    expect(errors.organizer).toMatch(/primary student organizer/)
    expect(errors.contact).toMatch(/email or phone/)
    expect(errors.spaceConfirmed).toMatch(/room or space/)
    expect(catalogPostingErrors(draft({ organizer: '  ', contact: '' }), NOW)).toMatchObject({
      organizer: expect.stringMatching(/organizer/), contact: expect.stringMatching(/email or phone/),
    })
    expect(catalogPostingErrors(draft({ spaceConfirmed: false }), NOW).spaceConfirmed).toMatch(/room or space/)
  })
  it('refuses a name as the contact, a broken email, a short phone, symbols only and text over the limits', () => {
    expect(catalogPostingErrors(draft({ contact: 'Ana' }), NOW).contact).toMatch(/email address or a phone number/)
    expect(catalogPostingErrors(draft({ contact: 'ana@scu' }), NOW).contact).toMatch(/email address or a phone number/)
    expect(catalogPostingErrors(draft({ contact: '554-40' }), NOW).contact).toMatch(/email address or a phone number/)
    expect(catalogPostingErrors(draft({ organizer: '!!!' }), NOW).organizer).toMatch(/letter or number/)
    expect(catalogPostingErrors(draft({ organizer: 'A'.repeat(ACCESS_LIMITS.organizer + 1) }), NOW).organizer).toMatch(/60 characters or fewer/)
    expect(catalogPostingErrors(draft({ contact: `${'a'.repeat(120)}@scu.edu` }), NOW).contact).toMatch(/120 characters or fewer/)
  })
  it('lets university department events skip the statement, but not student organizations', () => {
    const { organizer: _o, contact: _c, ...bare } = draft()
    expect(catalogPostingErrors({ ...bare, hostKind: 'department' }, NOW)).toEqual({})
    expect(toEventRow({ ...bare, hostKind: 'department' })).not.toHaveProperty('accessibility')
    expect(toEventRow({ ...bare, hostKind: 'department' }).host_kind).toBe('department')
    expect(catalogPostingErrors({ ...bare, hostKind: 'student-org' }, NOW).organizer).toMatch(/primary student organizer/)
    // No host kind means the stricter student organization rule.
    expect(catalogPostingErrors(bare as EventDraft, NOW).organizer).toMatch(/primary student organizer/)
    // A department that starts a statement must finish it, and it is built word for word.
    expect(catalogPostingErrors({ ...bare, hostKind: 'department', organizer: 'Ana Ruiz' }, NOW).contact).toMatch(/or leave both empty/)
    expect(toEventRow(draft({ hostKind: 'department' })).accessibility).toBe(STATEMENT)
    expect(catalogPostingErrors(draft({ hostKind: 'club' as never }), NOW).hostKind).toMatch(/who hosts/)
    // The space must be confirmed for every host.
    expect(catalogPostingErrors({ ...bare, hostKind: 'department', spaceConfirmed: false }, NOW).spaceConfirmed).toMatch(/room or space/)
  })
  it('create() enforces it for every caller and stores the statement', async () => {
    const rows = new Map<string, EventRow>()
    const catalog = createEventCatalog(createInMemoryEventTable(rows), clock)
    await expect(catalog.create(draft({ contact: '' }))).rejects.toMatchObject({ kind: 'invalid' })
    await expect(catalog.create(draft({ spaceConfirmed: false }))).rejects.toMatchObject({ kind: 'invalid', message: expect.stringMatching(/room or space/) })
    expect(rows.size).toBe(0)
    const created = await catalog.create(draft({ organizer: '  Ana Ruiz  ' }))
    expect(created).toMatchObject({ organizer: 'Ana Ruiz', contact: 'ana@scu.edu', accessibility: STATEMENT })
    expect(created).not.toHaveProperty('spaceConfirmed')
    const [row] = [...rows.values()]
    expect(row).toMatchObject({ organizer: 'Ana Ruiz', contact: 'ana@scu.edu', accessibility: STATEMENT })
    expect(row).not.toHaveProperty('spaceConfirmed')
  })
})

describe('events posted before the rule', () => {
  const old: EventRow = { id: '11111111-1111-4111-8111-111111111111', title: 'Old post', host_name: 'Club', description: 'x', location: 'Library', event_date: '2030-11-14', start_time: '14:30:00', end_time: '15:30:00' }
  it('still load, list and open, with no empty fields made up', async () => {
    const nulls = fromEventRow({ ...old, organizer: null, contact: null, accessibility: null })
    expect(nulls).not.toHaveProperty('contact')
    expect(nulls).not.toHaveProperty('accessibility')
    const event = fromEventRow(old)
    expect(isCatalogEvent(event)).toBe(true)
    const rows = new Map([[old.id, old]])
    expect(await createEventCatalog(createInMemoryEventTable(rows), clock).listUpcoming()).toEqual([event])
    const card = presentBrowseDetail(event, [], NOW)
    expect([card.organizer, card.contact, card.accessibility]).toEqual([null, null, null])
    expect(presentBrowseDetail({ ...event, organizer: 'Ana Ruiz', contact: 'ana@scu.edu', accessibility: STATEMENT }, [], NOW))
      .toMatchObject({ organizer: 'Ana Ruiz', contact: 'ana@scu.edu', accessibility: STATEMENT })
  })
})

describe.runIf(ACCESS_POLICY_ON)('server POST /api/events', () => {
  const servers: Server[] = []
  afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise<void>(r => s.close(() => r())))) })
  async function setup() {
    const rows = new Map<string, EventRow>()
    const api = createCatalogApi(createEventCatalog(createInMemoryEventTable(rows)))
    const server = createServer((req, res) => { void api(req, res).then(done => { if (!done) { res.writeHead(404); res.end() } }) })
    servers.push(server)
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
    const address = server.address(); if (!address || typeof address === 'string') throw Error('No address')
    const post = (value: unknown) => fetch(`http://127.0.0.1:${address.port}/api/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
    return { rows, post }
  }
  const live = (extra: Partial<EventDraft> = {}) => draft({ date: campusDateFromToday(30), ...extra })
  it('accepts a complete post and stores the statement it builds', async () => {
    const { rows, post } = await setup()
    const response = await post(live())
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ organizer: 'Ana Ruiz', contact: 'ana@scu.edu', accessibility: STATEMENT })
    expect([...rows.values()][0]).toMatchObject({ accessibility: STATEMENT })
  })
  it('refuses a post without them, with the readable reason, and writes nothing', async () => {
    const { rows, post } = await setup()
    const { organizer: _o, ...noOrganizer } = live()
    const missing = await post(noOrganizer)
    expect(missing.status).toBe(400)
    expect((await missing.json()).error).toMatch(/primary student organizer/)
    expect((await post(live({ spaceConfirmed: false }))).status).toBe(400)
    expect(rows.size).toBe(0)
  })
  it('accepts a department post without the statement', async () => {
    const { rows, post } = await setup()
    const { organizer: _o, contact: _c, ...bare } = live()
    const response = await post({ ...bare, hostKind: 'department' })
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ hostKind: 'department' })
    expect([...rows.values()][0]).not.toHaveProperty('accessibility')
    expect((await post({ ...bare, hostKind: 'student-org' })).status).toBe(400)
  })
  it('never takes the statement or wrong types from a client', async () => {
    const { rows, post } = await setup()
    expect((await post({ ...live(), accessibility: 'Email Ana.' })).status).toBe(400)
    expect((await post({ ...live(), contact: 42 })).status).toBe(400)
    expect((await post({ ...live(), spaceConfirmed: 'yes' })).status).toBe(400)
    expect(rows.size).toBe(0)
  })
})

describe('live table without the new columns yet', () => {
  const ID = '22222222-2222-4222-8222-222222222222'
  const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  it('recognises only the missing-column errors', () => {
    expect(isMissingAccessColumn({ code: 'PGRST204', message: "Could not find the 'organizer' column of 'events' in the schema cache" })).toBe(true)
    expect(isMissingAccessColumn({ code: '42703', message: 'column events.contact does not exist' })).toBe(true)
    expect(isMissingAccessColumn({ code: '42501', message: 'permission denied for contact' })).toBe(false)
    expect(isMissingAccessColumn({ code: '42703', message: 'column events.colour does not exist' })).toBe(false)
  })
  it('keeps posting and reading with the original columns, warning once', async () => {
    const bodies: Record<string, unknown>[] = [], selects: string[] = []
    const stored: EventRow[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const select = url.searchParams.get('select') ?? ''
      selects.push(select)
      // A table with neither the posting-policy nor the tags columns.
      if (/organizer|contact|accessibility/.test(select)) return response({ code: '42703', message: 'column events.organizer does not exist', details: null, hint: null }, 400)
      if (/tags/.test(select)) return response({ code: '42703', message: 'column events.tags does not exist', details: null, hint: null }, 400)
      if (request.method === 'POST') {
        const body = await request.json() as Record<string, unknown>
        bodies.push(body)
        stored.push({ ...(body as Omit<EventRow, 'id'>), id: ID, start_time: '14:30:00', end_time: '15:30:00' })
        return response(stored[stored.length - 1], 201)
      }
      return response(url.searchParams.has('id') ? stored[0] ?? null : stored)
    })
    const warn = vi.fn()
    const table = createSupabaseEventTable(createClient('https://sidequest-http.test', 'sb_publishable_fixture', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    }), warn)
    const catalog = createEventCatalog(table, clock)
    const created = await catalog.create(draft())
    expect(created.id).toBe(ID)
    expect(created).not.toHaveProperty('contact')
    for (const key of ['organizer', 'contact', 'accessibility', 'host_kind', 'spaceConfirmed']) expect(bodies.at(-1)).not.toHaveProperty(key)
    expect(await catalog.listUpcoming()).toHaveLength(1)
    expect(await catalog.getById(ID)).toMatchObject({ id: ID, title: 'Photo Walk' })
    // After the first miss, every request uses the original columns only.
    expect(selects.slice(-2).every(s => !/organizer|contact|accessibility/.test(s))).toBe(true)
    const accessWarnings = warn.mock.calls.filter(([m]) => /20261125010000_event_access_contact/.test(m))
    expect(accessWarnings).toHaveLength(1)
  })
  it('uses the columns once the migration is applied', async () => {
    const selects: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      selects.push(new URL(request.url).searchParams.get('select') ?? '')
      const body = await request.json() as Omit<EventRow, 'id'>
      return response({ ...body, id: ID, start_time: '14:30:00', end_time: '15:30:00' }, 201)
    })
    const warn = vi.fn()
    const catalog = createEventCatalog(createSupabaseEventTable(createClient('https://sidequest-http.test', 'sb_publishable_fixture', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    }), warn), clock)
    expect(await catalog.create(draft())).toMatchObject({ organizer: 'Ana Ruiz', contact: 'ana@scu.edu', accessibility: STATEMENT })
    expect(selects[0]).toMatch(/organizer,contact,accessibility,host_kind/)
    expect(warn.mock.calls.filter(([m]) => /event_access_contact/.test(m))).toHaveLength(0)
  })
})
