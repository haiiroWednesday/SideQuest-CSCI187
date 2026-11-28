// /api/me contract: a live session is required, inputs are checked against the database rules,
// and one student can never read or change another's plans, ideas, busy time or name.
// The fake gateway applies the same owner rule the RLS policies apply to a forwarded token.
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createPersonalApi, type PersonalGateway } from '../server/personalApi'
import { createMemoryPersonalTables } from '../src/model/personalData'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const TOKEN_A = 'token-for-student-a-unit-testing-only'
const TOKEN_B = 'token-for-student-b-unit-testing-only'
const EVENT = '00000000-0000-4000-8000-000000000001'
const EVENT_2 = '00000000-0000-4000-8000-000000000002'

const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>(resolve => server.close(() => resolve()))
})

async function start(gateway: PersonalGateway | null = fakeGateway()) {
  const api = createPersonalApi(gateway)
  const server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.statusCode = 404; res.end() } }) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  servers.push(server)
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  const call = (token: string | null, method: string, path: string, body?: unknown, origin = base) => fetch(base + path, {
    method,
    headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { base, call }
}

function fakeGateway(): PersonalGateway {
  const tables = createMemoryPersonalTables()
  const users: Record<string, string> = { [TOKEN_A]: A, [TOKEN_B]: B }
  return {
    async userFor(token) { return users[token] ?? null },
    storeFor(_token, userId) { return tables.forUser(userId) },
  }
}

describe('/api/me: sessions', () => {
  it('says accounts are off when the server has no gateway', async () => {
    const { call } = await start(null)
    const response = await call(TOKEN_A, 'GET', '/api/me')
    expect(response.status).toBe(503)
  })
  it('refuses requests without a token, or with a token that is not a live session', async () => {
    const { call } = await start()
    expect((await call(null, 'GET', '/api/me')).status).toBe(401)
    expect((await call('not-a-real-session-token-at-all', 'GET', '/api/me')).status).toBe(401)
    expect((await call('short', 'GET', '/api/me/plans')).status).toBe(401)
  })
  it('leaves other paths to the rest of the server', async () => {
    const { call } = await start()
    expect((await call(TOKEN_A, 'GET', '/api/events')).status).toBe(404)
  })
  it('refuses a change sent from another site', async () => {
    const { call } = await start()
    const response = await call(TOKEN_A, 'POST', '/api/me/plans', { eventId: EVENT }, 'https://elsewhere.example')
    expect(response.status).toBe(403)
  })
})

describe('/api/me: one student cannot reach another', () => {
  it('B sees none of A\'s plans, ideas, busy time or name, and cannot change them', async () => {
    const { call } = await start()
    expect((await call(TOKEN_A, 'POST', '/api/me/plans', { eventId: EVENT })).status).toBe(201)
    const idea = await (await call(TOKEN_A, 'POST', '/api/me/someday', { title: 'Try the climbing wall', note: 'with Ana' })).json() as { id: string }
    const busy = await (await call(TOKEN_A, 'POST', '/api/me/busy', { date: '2026-11-25', start: '09:00', end: '10:30' })).json() as { id: string }
    expect((await call(TOKEN_A, 'PUT', '/api/me/profile', { displayName: 'Cyn' })).status).toBe(200)

    const seenByB = await (await call(TOKEN_B, 'GET', '/api/me')).json()
    expect(seenByB).toEqual({ profile: null, plans: [], ideas: [], busy: [] })
    expect((await call(TOKEN_B, 'PATCH', `/api/me/someday?id=${idea.id}`, { title: 'Taken over' })).status).toBe(404)
    expect((await call(TOKEN_B, 'DELETE', `/api/me/someday?id=${idea.id}`)).status).toBe(404)
    expect((await call(TOKEN_B, 'DELETE', `/api/me/busy?id=${busy.id}`)).status).toBe(404)
    // Removing a plan B never made changes nothing for A.
    expect((await call(TOKEN_B, 'DELETE', `/api/me/plans?eventId=${EVENT}`)).status).toBe(204)

    const mine = await (await call(TOKEN_A, 'GET', '/api/me')).json() as { plans: string[]; ideas: { title: string }[]; busy: unknown[]; profile: unknown }
    expect(mine.plans).toEqual([EVENT])
    expect(mine.ideas.map(item => item.title)).toEqual(['Try the climbing wall'])
    expect(mine.busy).toHaveLength(1)
    expect(mine.profile).toEqual({ displayName: 'Cyn' })
  })
  it('keeps user IDs out of every reply', async () => {
    const { call } = await start()
    await call(TOKEN_A, 'POST', '/api/me/someday', { title: 'Picnic' })
    const text = await (await call(TOKEN_A, 'GET', '/api/me')).text()
    expect(text).not.toContain(A)
    expect(text).not.toContain('userId')
  })
})

describe('/api/me: the same rules as the database', () => {
  it('checks IDs, lengths, statuses and times before anything is saved', async () => {
    const { call } = await start()
    expect((await call(TOKEN_A, 'POST', '/api/me/plans', { eventId: 'not-a-uuid' })).status).toBe(400)
    expect((await call(TOKEN_A, 'POST', '/api/me/plans', { eventId: EVENT, userId: B })).status).toBe(400)
    expect((await call(TOKEN_A, 'POST', '/api/me/someday', { title: 'x'.repeat(121) })).status).toBe(400)
    expect((await call(TOKEN_A, 'POST', '/api/me/someday', { title: 'ok', note: 'y'.repeat(501) })).status).toBe(400)
    expect((await call(TOKEN_A, 'POST', '/api/me/someday', { title: 'ok', status: 'ready' })).status).toBe(400)
    expect((await call(TOKEN_A, 'POST', '/api/me/busy', { date: '2026-11-25', start: '11:00', end: '10:00' })).status).toBe(400)
    expect((await call(TOKEN_A, 'POST', '/api/me/busy', { date: '25/11/2026', start: '09:00', end: '10:00' })).status).toBe(400)
    expect((await call(TOKEN_A, 'POST', '/api/me/busy', { date: '2026-11-25', start: '09:00', end: '10:00', source: 'gossip' })).status).toBe(400)
    expect((await call(TOKEN_A, 'PUT', '/api/me/profile', { displayName: ' ' })).status).toBe(400)
    expect((await call(TOKEN_A, 'PUT', '/api/me/profile', { displayName: 'n'.repeat(61) })).status).toBe(400)
    const idea = await (await call(TOKEN_A, 'POST', '/api/me/someday', { title: 'Boba' })).json() as { id: string }
    expect((await call(TOKEN_A, 'PATCH', `/api/me/someday?id=${idea.id}`, { status: 'ready' })).status).toBe(400)
    expect((await call(TOKEN_A, 'PATCH', `/api/me/someday?id=${idea.id}`, { status: 'ready', eventId: EVENT_2 })).status).toBe(200)
    expect((await call(TOKEN_A, 'PATCH', `/api/me/someday?id=${idea.id}`, { status: 'maybe' })).status).toBe(400)
    expect(await (await call(TOKEN_A, 'GET', '/api/me')).json()).toMatchObject({ plans: [], busy: [] })
  })
  it('stops at 100 plans and treats a repeated plan as done', async () => {
    const { call } = await start()
    const id = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
    for (let i = 1; i <= 100; i++) expect((await call(TOKEN_A, 'POST', '/api/me/plans', { eventId: id(i) })).status).toBe(201)
    expect((await call(TOKEN_A, 'POST', '/api/me/plans', { eventId: id(1) })).status).toBe(201)
    const over = await call(TOKEN_A, 'POST', '/api/me/plans', { eventId: id(101) })
    expect(over.status).toBe(409)
    expect((await over.json() as { error: string }).error).toContain('100')
    expect(((await (await call(TOKEN_A, 'GET', '/api/me/plans')).json()) as { plans: string[] }).plans).toHaveLength(100)
  })
  it('refuses a body that is too large and requests that are not JSON', async () => {
    const { base, call } = await start()
    expect((await call(TOKEN_A, 'POST', '/api/me/someday', { title: 'big', note: 'z'.repeat(5000) })).status).toBe(413)
    const raw = await fetch(base + '/api/me/someday', { method: 'POST', headers: { Origin: base, Authorization: `Bearer ${TOKEN_A}`, 'Content-Type': 'text/plain' }, body: 'title=hi' })
    expect(raw.status).toBe(415)
  })
  it('answers unknown routes and methods plainly', async () => {
    const { call } = await start()
    expect((await call(TOKEN_A, 'PUT', '/api/me/plans', { eventId: EVENT })).status).toBe(405)
    expect((await call(TOKEN_A, 'GET', '/api/me/everything')).status).toBe(404)
  })
})

describe('/api/me is wired into both servers', () => {
  it('production and dev servers hand requests to the personal API', async () => {
    const { readFile } = await import('node:fs/promises')
    // Both servers run the one shared handler list, and that list includes /api/me.
    for (const file of ['server/index.ts', 'vite.config.ts']) {
      const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
      expect(source, file).toMatch(/createServerHandlers\(/)
      expect(source, file).toMatch(/runHandlers\(handlers, req, res\)/)
    }
    const { createServerHandlers } = await import('../server/handlers')
    expect(createServerHandlers({}, { catalog: null }).map(h => h.name)).toContain('personal')
  })
})
