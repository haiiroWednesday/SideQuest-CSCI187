import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemorySocialStore, createSocialApi, createSocialApiFromEnv } from '../server/socialApi'
import type { SocialGroup } from '../src/controller/socialPlans'

const NOW = new Date('2026-11-24T18:40:00Z') // 10:40 in Santa Clara
const T = { you: 'token-you-0000000000000000', maya: 'token-maya-000000000000000', priya: 'token-priya-00000000000000', ana: 'token-ana-0000000000000000' }
const groups: SocialGroup[] = [
  { id: 'g1', name: 'Swig', members: ['You', 'Maya', 'Jun'] },
  { id: 'g2', name: 'ACM', members: ['You', 'Priya'] },
  { id: 'g5', name: 'Film', members: ['Ana', 'Ben'], inviteFrom: 'Ana' },
]
const servers: Server[] = []
afterEach(async () => { for (const s of servers.splice(0)) await new Promise<void>(r => s.close(() => r())) })

async function start(enabled = true) {
  const store = createMemorySocialStore(groups, { [T.you]: 'You', [T.maya]: 'Maya', [T.priya]: 'Priya', [T.ana]: 'Ana' })
  const api = createSocialApi(enabled ? store : null, () => NOW)
  const server = createServer((req, res) => { void api(req, res).then(h => { if (!h) { res.statusCode = 404; res.end() } }) })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  servers.push(server)
  return 'http://127.0.0.1:' + (server.address() as AddressInfo).port
}
const call = (base: string, method: string, path: string, token: string, body?: unknown, origin = base) => fetch(base + path, {
  method, headers: { Authorization: 'Bearer ' + token, ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}) },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
})
const invite = { title: 'Boba run', place: 'Benson', date: '2026-11-24', start: '13:00', end: '14:00', groupIds: ['g1'] }

describe('/api/social', () => {
  it('is off by default: status says so and every other route is not enabled', async () => {
    const base = await start(false)
    expect(await (await fetch(base + '/api/social/status')).json()).toEqual({ enabled: false })
    expect((await call(base, 'GET', '/api/social/invites', T.you)).status).toBe(404)
    const env = createSocialApiFromEnv({ SIDEQUEST_SOCIAL_ENABLED: 'true' })
    const server = createServer((req, res) => { void env(req, res) })
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); servers.push(server)
    const b2 = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
    expect(await (await fetch(b2 + '/api/social/status')).json()).toEqual({ enabled: false })
  })
  it('needs a live session and the SideQuest origin for writes', async () => {
    const base = await start()
    expect((await call(base, 'GET', '/api/social/invites', 'nope')).status).toBe(401)
    expect((await call(base, 'POST', '/api/social/invites', T.you, invite, 'http://evil.example')).status).toBe(403)
  })
  it('sends an invite that only the chosen groups see, and refuses bad ones', async () => {
    const base = await start()
    const sent = await call(base, 'POST', '/api/social/invites', T.you, invite)
    expect(sent.status).toBe(201)
    const id = (await sent.json()).invite.id
    expect((await (await call(base, 'GET', '/api/social/invites', T.maya)).json()).invites.map((i: { id: string }) => i.id)).toEqual([id])
    expect((await (await call(base, 'GET', '/api/social/invites', T.priya)).json()).invites).toEqual([])
    expect((await (await call(base, 'GET', '/api/social/invites', T.ana)).json()).invites).toEqual([])
    const bad = await call(base, 'POST', '/api/social/invites', T.you, { ...invite, groupIds: ['g5'] })
    expect(bad.status).toBe(400)
    expect((await bad.json()).errors.groups).toBeTruthy()
    expect((await call(base, 'POST', '/api/social/invites', T.you, { ...invite, lat: 37.35 })).status).toBe(400)
  })
  it('lets the audience join once, hides the invite from others, and only the sender makes it a plan', async () => {
    const base = await start()
    const id = (await (await call(base, 'POST', '/api/social/invites', T.you, invite)).json()).invite.id
    expect((await call(base, 'POST', `/api/social/invites/${id}/join`, T.priya)).status).toBe(404)
    expect((await call(base, 'POST', `/api/social/invites/${id}/plan`, T.you, { groupId: 'g1' })).status).toBe(409)
    expect((await call(base, 'POST', `/api/social/invites/${id}/join`, T.maya)).status).toBe(200)
    expect((await call(base, 'POST', `/api/social/invites/${id}/join`, T.maya)).status).toBe(409)
    expect((await call(base, 'POST', `/api/social/invites/${id}/call-off`, T.maya)).status).toBe(403)
    const planned = await call(base, 'POST', `/api/social/invites/${id}/plan`, T.you, { groupId: 'g1' })
    expect((await planned.json()).invite.status).toBe('planned')
  })
  it('shares free/busy only and returns just the overlap, once you share too', async () => {
    const base = await start()
    await call(base, 'PUT', '/api/social/free', T.maya, { slots: [{ date: '2026-11-24', start: '12:00', end: '15:00', title: 'Therapy' }] })
    await call(base, 'PUT', '/api/social/groups/g1/sharing', T.maya, { on: true })
    const before = await (await call(base, 'GET', '/api/social/groups/g1/common', T.you)).json()
    expect(before.locked).toBe(true)
    expect(before.windows).toEqual([])
    await call(base, 'PUT', '/api/social/free', T.you, { slots: [{ date: '2026-11-24', start: '13:30', end: '17:00' }] })
    await call(base, 'PUT', '/api/social/groups/g1/sharing', T.you, { on: true })
    const after = await (await call(base, 'GET', '/api/social/groups/g1/common', T.you)).json()
    expect(after.windows).toEqual([{ date: '2026-11-24', start: '13:30', end: '15:00' }])
    expect(after.notShared).toEqual(['Jun'])
    expect(JSON.stringify(after)).not.toContain('Therapy')
    expect((await call(base, 'PUT', '/api/social/groups/g5/sharing', T.you, { on: true })).status).toBe(404)
    expect((await call(base, 'PUT', '/api/social/free', T.you, { slots: [], where: 'home' })).status).toBe(400)
  })
})
