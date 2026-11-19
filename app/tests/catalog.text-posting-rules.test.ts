// Posting-only text rules: shorter field limits and a letter-or-digit rule for
// names and places. Reads keep the CATALOG_LIMITS storage ceiling, so older,
// longer events still list, open and can be planned.
import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import textPolicySql from '../../supabase/migrations/20261111000000_event_text_posting_rules.sql?raw'
import { createCatalogApi } from '../server/api'
import {
  CATALOG_LIMITS, POSTING_LIMITS, catalogPostingErrors, createEventCatalog, hasLetterOrDigit,
  isCatalogEvent, toEventRow, type EventDraft, type EventRow,
} from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'

// 12:00 noon in Santa Clara on 2026-11-08; the event is a week later.
const NOW = new Date('2026-11-08T20:00:00Z')
const clock = () => NOW
const draft = (extra: Partial<EventDraft> = {}): EventDraft => ({
  title: 'Photo Walk', hostName: 'Art Club', description: 'Bring a camera.', location: 'Library',
  date: '2026-11-15', start: '14:30', end: '15:30', ...extra,
})
const FIELDS = ['title', 'hostName', 'description', 'location'] as const
const NAMED_FIELDS = ['title', 'hostName', 'location'] as const
const LETTER_ERROR = 'must include at least one letter or number'

describe('posting limits', () => {
  it('stay at or below the storage ceiling for every field', () => {
    for (const field of FIELDS) expect(POSTING_LIMITS[field]).toBeLessThanOrEqual(CATALOG_LIMITS[field])
    expect(POSTING_LIMITS).toEqual({ title: 80, hostName: 60, description: 1000, location: 120 })
  })

  it.each(FIELDS)('%s: accepts the posting limit and rejects one more', field => {
    const max = POSTING_LIMITS[field]
    expect(catalogPostingErrors(draft({ [field]: 'x'.repeat(max) }), NOW)).toEqual({})
    expect(catalogPostingErrors(draft({ [field]: 'x'.repeat(max + 1) }), NOW)[field]).toContain(`must be ${max} characters or fewer`)
  })

  it.each(FIELDS)('%s: shows the posting limit, not the storage ceiling, above both', field => {
    const message = catalogPostingErrors(draft({ [field]: 'x'.repeat(CATALOG_LIMITS[field] + 1) }), NOW)[field]
    expect(message).toContain(`${POSTING_LIMITS[field]} characters`)
  })

  it('measures the trimmed value', () => {
    expect(catalogPostingErrors(draft({ title: `  ${'x'.repeat(80)}  ` }), NOW)).toEqual({})
  })

  it.each(FIELDS)('%s: create() rejects one over the posting limit and stores nothing', async field => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, clock)
    await expect(catalog.create(draft({ [field]: 'x'.repeat(POSTING_LIMITS[field] + 1) })))
      .rejects.toMatchObject({ kind: 'invalid', message: expect.stringContaining(`${POSTING_LIMITS[field]} characters`) })
    expect(table.rows.size).toBe(0)
    await expect(catalog.create(draft({ [field]: 'x'.repeat(POSTING_LIMITS[field]) }))).resolves.toMatchObject({ [field]: 'x'.repeat(POSTING_LIMITS[field]) })
  })
})

describe('letter-or-digit rule', () => {
  it.each(['&&&&', '!!!', '🎉🎉', '— · —', '½²①'])('rejects %j', text => {
    expect(hasLetterOrDigit(text)).toBe(false)
  })
  it.each(['読書会', 'Café Night', '🎉 Party 2', '٣', 'x'])('accepts %j', text => {
    expect(hasLetterOrDigit(text)).toBe(true)
  })

  it.each(NAMED_FIELDS)('%s: rejects symbols only, with its own message', field => {
    const errors = catalogPostingErrors(draft({ [field]: '&&&&' }), NOW)
    expect(Object.keys(errors)).toEqual([field])
    expect(errors[field]).toContain(LETTER_ERROR)
  })

  it.each(NAMED_FIELDS)('%s: accepts Unicode letters and emoji mixed with text', field => {
    for (const text of ['読書会', 'Café Night', '🎉 Party 2']) expect(catalogPostingErrors(draft({ [field]: text }), NOW)).toEqual({})
  })

  it('does not apply to the description', () => {
    expect(catalogPostingErrors(draft({ description: '&&&&' }), NOW)).toEqual({})
  })

  it('keeps the "Please enter" message for a blank field', () => {
    expect(catalogPostingErrors(draft({ title: '   ' }), NOW).title).toBe('Please enter the event title.')
  })

  it('is enforced by create() so direct Model callers cannot bypass it', async () => {
    const table = createInMemoryEventTable()
    await expect(createEventCatalog(table, clock).create(draft({ title: '&&&&' })))
      .rejects.toMatchObject({ kind: 'invalid', message: expect.stringContaining(LETTER_ERROR) })
    expect(table.rows.size).toBe(0)
  })
})

describe('server API text rules', () => {
  const servers: Server[] = []
  afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))) })
  async function startApi() {
    const table = createInMemoryEventTable()
    const api = createCatalogApi(createEventCatalog(table, clock))
    const server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.writeHead(404); res.end() } }) })
    servers.push(server)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address(); if (!address || typeof address === 'string') throw Error('No address')
    const post = (body: EventDraft) => fetch(`http://127.0.0.1:${address.port}/api/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return { table, post }
  }

  it.each(FIELDS)('%s: 201 at the posting limit, 400 one over with no write', async field => {
    const { table, post } = await startApi()
    const over = await post(draft({ [field]: 'x'.repeat(POSTING_LIMITS[field] + 1) }))
    expect(over.status).toBe(400)
    expect((await over.json()).error).toContain(`${POSTING_LIMITS[field]} characters`)
    expect(table.rows.size).toBe(0)
    expect((await post(draft({ [field]: 'x'.repeat(POSTING_LIMITS[field]) }))).status).toBe(201)
    expect(table.rows.size).toBe(1)
  })

  it.each(NAMED_FIELDS)('%s: 400 for symbols only, 201 for 読書会', async field => {
    const { table, post } = await startApi()
    const response = await post(draft({ [field]: '&&&&' }))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain(LETTER_ERROR)
    expect((await post(draft({ [field]: '読書会' }))).status).toBe(201)
    expect(table.rows.size).toBe(1)
  })
})

// Behavior is tested by supabase/tests/event_text_posting_rules.sql in CI;
// this keeps the policy text in step with the Model during a local `npm test`.
describe('database text posting policy', () => {
  const sql = textPolicySql.replace(/\s+/g, ' ')
  it.each([['title', 'title'], ['hostName', 'host_name'], ['description', 'description'], ['location', 'location']] as const)(
    '%s limit equals the policy bound on %s', (field, column) => {
      const bound = new RegExp(`char_length\\(btrim\\(${column}\\)\\) <= (\\d+)`).exec(sql)
      expect(bound, `no posting bound for ${column}`).not.toBeNull()
      expect(Number(bound![1])).toBe(POSTING_LIMITS[field])
    })
  it.each(['title', 'host_name', 'location'])('requires a letter or digit in %s with the ICU collation', column => {
    expect(sql).toContain(`${column} collate "und-x-icu" ~ '[[:alnum:]]'`)
  })
  it('does not require a letter or digit in the description', () => {
    expect(sql).not.toContain(`description collate`)
  })
  it('repeats the posting-horizon date window, since ALTER POLICY replaces it', () => {
    expect(sql).toContain(`alter policy "Anyone may submit a valid event" on public.events with check (`)
    expect(sql).toContain(`event_date between (now() at time zone 'America/Los_Angeles')::date and ((now() at time zone 'America/Los_Angeles')::date + interval '1 year')::date`)
  })
  it('adds or changes no CHECK constraint', () => {
    expect(sql).not.toMatch(/\bconstraint\b|\bcheck \(length/i)
  })
})

describe('stored events above the posting limits stay readable', () => {
  const oversized = (): Omit<EventRow, 'id'> => toEventRow(draft({
    title: '&'.repeat(CATALOG_LIMITS.title), hostName: 'H'.repeat(CATALOG_LIMITS.hostName),
    description: 'D'.repeat(CATALOG_LIMITS.description), location: 'L'.repeat(CATALOG_LIMITS.location),
  }))

  it('lists and opens a row at the storage ceiling', async () => {
    const rows = new Map<string, EventRow>()
    const stored = await createInMemoryEventTable(rows).insert(oversized())
    const catalog = createEventCatalog(createInMemoryEventTable(rows), clock)
    const [listed] = await catalog.listUpcoming()
    expect(listed).toMatchObject({ id: stored.id, title: '&'.repeat(120) })
    expect(isCatalogEvent(listed)).toBe(true)
    expect(await catalog.getById(stored.id)).toEqual(listed)
    // Planning needs browser storage; see posting.text-rules.form.test.tsx.
  })
})
