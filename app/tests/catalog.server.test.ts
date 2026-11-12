import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createCatalogApi, POSTS_PER_MINUTE } from '../server/api'
import { createEventCatalog } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'
import { createHttpEventCatalog } from '../src/model/httpEventCatalog'
import { campusDateFromToday } from './fixtures/campusDates'

const servers: Server[] = []
const draft = { title: 'Server workshop', hostName: 'Art Club', description: 'Paint together', location: 'Library', date: campusDateFromToday(30), start: '14:30', end: '15:30' }
async function setup(configured = true) {
  const table = createInMemoryEventTable()
  const api = createCatalogApi(configured ? createEventCatalog(table) : null)
  const server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.writeHead(404); res.end() } }) })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address(); if (!address || typeof address === 'string') throw Error('No address')
  const url = `http://127.0.0.1:${address.port}`
  const post = (value: unknown) => fetch(url + '/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
  return { table, url, post }
}
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))) })

describe('same-origin server API', () => {
  it('exposes only a connection flag and keeps server credentials out of configuration', async () => {
    const { url } = await setup()
    const response = await fetch(url + '/api/catalog')
    expect(await response.json()).toEqual({ shared: true })
    const unconfigured = await setup(false)
    expect(await (await fetch(unconfigured.url + '/api/catalog')).json()).toEqual({ shared: false })
    expect((await unconfigured.post(draft)).status).toBe(503)
  })
  it('posts and reads through separate HTTP clients, including Unicode descriptions', async () => {
    const { url, table } = await setup()
    const fetcher: typeof fetch = (input, init) => fetch(url + String(input), init)
    const poster = createHttpEventCatalog(fetcher), reader = createHttpEventCatalog(fetcher)
    const created = await poster.create({ ...draft, description: '陶艺 🏺 '.repeat(150) })
    expect(await reader.getById(created.id)).toEqual(created)
    expect(await reader.listUpcoming()).toEqual([created])
    expect(table.rows.size).toBe(1)
  })
  it.each([{ ...draft, date: '2000-01-01' }, { ...draft, end: '14:00' }, { ...draft, description: 'x'.repeat(2001) }, { ...draft, id: 'client-owned' }])('rejects invalid direct HTTP input without a write', async input => {
    const { post, table } = await setup()
    expect((await post(input)).status).toBe(400)
    expect(table.rows.size).toBe(0)
  })
  it.each(['DELETE', 'PATCH', 'PUT'])('does not forward public %s operations', async method => {
    const { url, table } = await setup()
    expect((await fetch(url + '/api/events', { method })).status).toBe(405)
    expect(table.rows.size).toBe(0)
  })
  it('rejects cross-origin writes, malformed JSON, oversized bodies and unsupported fields', async () => {
    const { url, table } = await setup()
    expect((await fetch(url + '/api/events', { method: 'POST', headers: { Origin: 'https://other.test', 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })).status).toBe(403)
    expect((await fetch(url + '/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })).status).toBe(400)
    expect((await fetch(url + '/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(17_000) })).status).toBe(413)
    expect((await fetch(url + '/api/events', { method: 'POST', body: 'text' })).status).toBe(415)
    expect(table.rows.size).toBe(0)
  })
  it('limits repeated submissions without trusting spoofed forwarded addresses', async () => {
    const { url, post, table } = await setup()
    for (let i = 0; i < POSTS_PER_MINUTE; i++) expect((await post(draft)).status).toBe(201)
    expect((await fetch(url + '/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': 'different' }, body: JSON.stringify(draft) })).status).toBe(429)
    expect(table.rows.size).toBe(POSTS_PER_MINUTE)
  })
})


it.each(['sb_secret_fixture_not_real', `fixture.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.fixture`])('rejects privileged server credentials before connecting', key => {
  expect(() => createSupabaseEventCatalogFromEnv({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: key })).toThrow('Privileged keys are not supported')
})
