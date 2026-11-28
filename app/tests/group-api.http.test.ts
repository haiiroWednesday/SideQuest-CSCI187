import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createGroupApi, GroupGatewayError, type AuthenticatedGroupGateway,
} from '../server/groupApi'
import { createSupabaseGroupGatewayFromEnv } from '../server/supabaseGroupAccess'

const orgId = '11111111-1111-4111-8111-111111111111'
const memberId = '22222222-2222-4222-8222-222222222222'
const outsiderId = '33333333-3333-4333-8333-333333333333'
const planId = '44444444-4444-4444-8444-444444444444'
const eventId = '55555555-5555-4555-8555-555555555555'
const orgToken = 'A'.repeat(40)
const memberToken = 'B'.repeat(40)
const outsiderToken = 'C'.repeat(40)
const invalidToken = 'X'.repeat(40)
const secretPlan = {
  id: planId, eventId, organizerId: orgId, status: 'proposed', revision: 2,
  invitations: [],
  participants: [
    { userId: memberId, response: 'if', ifCondition: 'If my exam ends by 3' },
    { userId: outsiderId, response: null, ifCondition: null },
  ],
  sourceSecret: 'Never expose this',
}

const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

async function listen(gateway: AuthenticatedGroupGateway | null, clock: () => number = Date.now) {
  const api = createGroupApi(gateway, clock)
  const server = createServer((req, res) => {
    void api(req, res).then(handled => {
      if (!handled) { res.statusCode = 404; res.end('Not found') }
    })
  })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  return `http://127.0.0.1:${port}`
}

function mockGateway(): AuthenticatedGroupGateway {
  return {
    verify: vi.fn(async token => token === orgToken ? { userId: orgId }
      : token === memberToken ? { userId: memberId }
        : token === outsiderToken ? { userId: outsiderId } : null),
    list: vi.fn(async () => [{ id: planId, eventId, organizerId: orgId, status: 'proposed', revision: 2, participants: ['leak'] }]),
    create: vi.fn(async () => secretPlan),
    read: vi.fn(async () => secretPlan),
    action: vi.fn(async () => secretPlan),
  }
}

async function send(base: string, path: string, token = orgToken, body?: unknown, headers?: Record<string,string>) {
  const hasBody = body !== undefined
  return fetch(base + path, {
    method: hasBody ? 'POST' : 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(hasBody ? { 'Content-Type': 'application/json', Origin: base } : {}),
      ...headers,
    },
    ...(hasBody ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  })
}

describe('opt-in group HTTP gateway and verified identity contract', () => {
  it('leaves public catalog routing untouched and group routes unavailable by default', async () => {
    const base = await listen(null)
    expect((await send(base, '/api/catalog')).status).toBe(404)
    const groups = await send(base, '/api/groups')
    expect(groups.status).toBe(503)
    expect(await groups.json()).toEqual({ error: 'Group planning is not enabled.' })
    expect(createSupabaseGroupGatewayFromEnv({ SIDEQUEST_GROUPS_ENABLED: 'false' })).toBeNull()
    expect(createSupabaseGroupGatewayFromEnv({ SIDEQUEST_GROUPS_ENABLED: 'true' })).toBeNull()
    expect(() => createSupabaseGroupGatewayFromEnv({
      SIDEQUEST_GROUPS_ENABLED: 'true',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never_allow',
    })).toThrow(/publishable/)
  })

  it('requires a real verifier result and never accepts client-provided actor IDs', async () => {
    const gateway = mockGateway()
    const base = await listen(gateway)
    expect((await send(base, '/api/groups', '')).status).toBe(401)
    expect((await send(base, '/api/groups', invalidToken)).status).toBe(401)
    expect((await send(base, '/api/groups', orgToken, { eventId, actorId: outsiderId })).status).toBe(400)
    expect(gateway.create).not.toHaveBeenCalled()
    const success = await send(base, '/api/groups', orgToken, { eventId })
    expect(success.status).toBe(201)
    expect(gateway.create).toHaveBeenCalledWith(orgToken, eventId)
    // Only an If answer carries a note; the unanswered member has none.
    expect((await success.json()).participants[1]).not.toHaveProperty('ifCondition')
  })

  it('shares If notes with members, never on other answers, and never returns raw SQL columns', async () => {
    const gateway = mockGateway()
    const base = await listen(gateway)
    const orgResult = await (await send(base, '/api/groups/' + planId, orgToken)).json()
    expect(orgResult.participants[0]).toEqual({ userId: memberId, response: 'if', ifCondition: 'If my exam ends by 3' })
    expect(orgResult).not.toHaveProperty('sourceSecret')

    const memberResult = await (await send(base, '/api/groups/' + planId, memberToken)).json()
    expect(memberResult.participants[0].ifCondition).toBe('If my exam ends by 3')
    expect(memberResult.participants[1]).not.toHaveProperty('ifCondition')

    // A faulty upstream that attaches text to a non-If answer is cleaned by the gateway.
    const leaky = { ...secretPlan, participants: [{ userId: outsiderId, response: 'works', ifCondition: 'leaked text' }, secretPlan.participants[0]] }
    const leakyBase = await listen({ ...gateway, read: vi.fn(async () => leaky) })
    const cleaned = await (await send(leakyBase, '/api/groups/' + planId, memberToken)).json()
    expect(JSON.stringify(cleaned)).not.toContain('leaked text')

    // Simulate a faulty upstream RPC returning another group's raw record.
    // The Node gateway must still refuse to expose its event or participant list.
    const rogue = { ...secretPlan, participants: [{ userId: memberId, response: 'works', ifCondition: null }] }
    const otherGateway = { ...gateway, read: vi.fn(async () => rogue) }
    const otherBase = await listen(otherGateway)
    const denied = await send(otherBase, '/api/groups/' + planId, outsiderToken)
    expect(denied.status).toBe(404)
    expect((await denied.json()).error).toBe('Plan unavailable.')
  })

  it('rejects a different plan even when the caller belongs to both plans', async () => {
    const wrongPlan = { ...secretPlan, id: '66666666-6666-4666-8666-666666666666' }
    const gateway = { ...mockGateway(), read: vi.fn(async () => wrongPlan),
      action: vi.fn(async () => wrongPlan) }
    const base = await listen(gateway)
    const read = await send(base, '/api/groups/' + planId, memberToken)
    expect(read.status).toBe(503)
    expect(await read.json()).toEqual({ error: 'The group response is unavailable.' })
    const write = await send(base, '/api/groups/' + planId + '/actions', memberToken, {
      expectedRevision: 2, action: 'respond', response: 'works',
    })
    expect(write.status).toBe(503)
    expect(await write.json()).toEqual({ error: 'The group response is unavailable.' })
  })

  it('rejects a creation response for the wrong event or organizer', async () => {
    for (const raw of [
      { ...secretPlan, eventId: planId },
      { ...secretPlan, organizerId: memberId, participants: [{ userId: orgId, response: null }] },
    ]) {
      const base = await listen({ ...mockGateway(), create: vi.fn(async () => raw) })
      const response = await send(base, '/api/groups', orgToken, { eventId })
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ error: 'The group response is unavailable.' })
    }
  })

  it('withholds the entire roster from pending recipients even if the RPC returns it', async () => {
    const raw = { ...secretPlan, invitations: [outsiderId], participants: [secretPlan.participants[0]] }
    const gateway = { ...mockGateway(), read: vi.fn(async () => raw) }
    const base = await listen(gateway)
    const result = await send(base, '/api/groups/' + planId, outsiderToken)
    expect(result.status).toBe(200)
    expect(await result.json()).toMatchObject({ invitations: [outsiderId], participants: [] })
  })

  it('returns only a null receipt for decline and leave', async () => {
    const gateway = { ...mockGateway(), action: vi.fn(async () => null) }
    const base = await listen(gateway)
    for (const action of ['decline', 'leave']) {
      const res = await send(base, '/api/groups/' + planId + '/actions', memberToken, { expectedRevision: 2, action })
      expect(res.status).toBe(200)
      expect(await res.json()).toBeNull()
    }
  })

  it('allows only validated actions without forged user targets', async () => {
    const gateway = mockGateway(), base = await listen(gateway)
    const path = '/api/groups/' + planId + '/actions'
    const bad = [
      { expectedRevision: 2, action: 'respond', response: 'works', userId: outsiderId },
      { expectedRevision: 2, action: 'invite', inviteeId: 'not-uuid' },
      { expectedRevision: 2, action: 'respond', response: 'if', condition: 42 },
      { expectedRevision: 2, action: 'confirm', inviteeId: memberId },
      { expectedRevision: -1, action: 'cancel' },
    ]
    for (const payload of bad) {
      expect((await send(base, path, orgToken, payload)).status).toBe(400)
    }
    expect(gateway.action).not.toHaveBeenCalled()
    expect((await send(base, path, orgToken, {
      expectedRevision: 2, action: 'invite', inviteeId: memberId,
    })).status).toBe(200)
    expect(gateway.action).toHaveBeenCalledWith(orgToken, planId, {
      expectedRevision: 2, action: 'invite', inviteeId: memberId,
    })
  })

  it('allows If without a condition and normalizes blank text to null', async () => {
    const gateway = mockGateway(), base = await listen(gateway)
    const path = '/api/groups/' + planId + '/actions'
    for (const extra of [{}, { condition: null }, { condition: '  ' }]) {
      expect((await send(base, path, memberToken, {
        expectedRevision: 2, action: 'respond', response: 'if', ...extra,
      })).status).toBe(200)
      expect(gateway.action).toHaveBeenLastCalledWith(memberToken, planId, {
        expectedRevision: 2, action: 'respond', response: 'if', condition: null,
      })
    }
  })

  it('does not accept cross-site writes, malformed JSON or unexpected paths', async () => {
    const gateway = mockGateway(), base = await listen(gateway)
    const path = '/api/groups'
    expect((await send(base, path, orgToken, { eventId },
      { Origin: 'https://attacker.example' })).status).toBe(403)
    expect((await send(base, path, orgToken, '{broken')).status).toBe(400)
    expect((await send(base, path, orgToken, { eventId, other: 'unexpected' })).status).toBe(400)
    expect((await send(base, '/api/groups/not-a-uuid', orgToken)).status).toBe(404)
    expect((await send(base, '/api/groups/' + planId + '/invalid', orgToken)).status).toBe(404)
    expect(gateway.create).not.toHaveBeenCalled()
  })

  it('maps stale revisions to a generic conflict and does not leak database errors', async () => {
    const gateway = { ...mockGateway(),
      action: vi.fn(async () => { throw new GroupGatewayError(409, 'The group request could not be completed.') }),
    }
    const base = await listen(gateway)
    const result = await send(base, '/api/groups/' + planId + '/actions', orgToken, {
      expectedRevision: 1, action: 'confirm',
    })
    expect(result.status).toBe(409)
    expect(await result.json()).toEqual({ error: 'The group request could not be completed.' })
    expect(result.headers.get('cache-control')).toBe('private, no-store')
  })

  it('limits verified accounts independently of a shared proxy address', async () => {
    const gateway = mockGateway()
    const base = await listen(gateway, () => 0)
    for (let i = 0; i < 40; i++) expect((await send(base, '/api/groups', orgToken)).status).toBe(200)
    expect((await send(base, '/api/groups', orgToken)).status).toBe(429)
    // An over-quota known account must not make another upstream Auth call.
    expect(gateway.verify).toHaveBeenCalledTimes(40)
    expect((await send(base, '/api/groups', memberToken)).status).toBe(200)
  })

  it('reserves Auth capacity for established sessions without caching authorization', async () => {
    let now = 0
    const gateway = mockGateway()
    const base = await listen(gateway, () => now)
    const status = async (token: string) => {
      const result = await send(base, '/api/groups', token)
      await result.text()
      return result.status
    }
    expect(await status(orgToken)).toBe(200)
    // 399 rotating invalid tokens plus the verified request exhaust the
    // 400 general admissions, regardless of the apparent proxy address.
    for (let start = 0; start < 399; start += 20) {
      const batch = Array.from({ length: Math.min(20, 399 - start) },
        (_, i) => status('invalid-token-'.repeat(2) + (start + i)))
      expect(await Promise.all(batch)).toEqual(Array(batch.length).fill(401))
    }
    expect(await status(invalidToken)).toBe(429)
    expect(await status(memberToken)).toBe(429)
    expect(gateway.verify).toHaveBeenCalledTimes(400)
    expect(await status(orgToken)).toBe(200)
    expect(gateway.verify).toHaveBeenCalledTimes(401)
    expect(gateway.list).toHaveBeenCalledTimes(2)

    // A previously recognized bearer still requires fresh verification;
    // an invalidated token must never reach a private RPC.
    vi.mocked(gateway.verify).mockResolvedValueOnce(null)
    expect(await status(orgToken)).toBe(401)
    expect(await status(orgToken)).toBe(429)
    expect(gateway.verify).toHaveBeenCalledTimes(402)
    expect(gateway.list).toHaveBeenCalledTimes(2)

    now = 60_000
    expect(await status(memberToken)).toBe(200)
    expect(gateway.verify).toHaveBeenCalledTimes(403)
  }, 20_000)

  it('bounds the reserved lane and expires admission hints', async () => {
    let now = 0
    const tokens = Array.from({ length: 6 }, (_, i) => 'recognized-token-'.repeat(2) + i)
    const gateway = mockGateway()
    vi.mocked(gateway.verify).mockImplementation(async token => {
      const index = tokens.indexOf(token)
      return index < 0 ? null : { userId: '11111111-1111-4111-8111-' + String(index).padStart(12, '0') }
    })
    const base = await listen(gateway, () => now)
    const status = async (token: string) => {
      const result = await send(base, '/api/groups', token)
      await result.text()
      return result.status
    }
    for (const token of tokens) expect(await status(token)).toBe(200)
    for (let start = 0; start < 394; start += 20) {
      const batch = Array.from({ length: Math.min(20, 394 - start) },
        (_, i) => status('invalid-token-'.repeat(2) + (start + i)))
      expect(await Promise.all(batch)).toEqual(Array(batch.length).fill(401))
    }
    // 200 additional verifications are available across established accounts.
    // The 40-per-account limit still applies; distribute across six actors.
    for (let i = 0; i < 200; i += 20) {
      const batch = Array.from({ length: 20 }, (_, j) => status(tokens[(i + j) % tokens.length]))
      expect(await Promise.all(batch)).toEqual(Array(20).fill(200))
    }
    expect(await status(tokens[0])).toBe(429)
    expect(gateway.verify).toHaveBeenCalledTimes(600)

    now = 5 * 60_000
    // The reserve is not a permanent entitlement: the hints expire after
    // five minutes, and a new general-budget flood cannot use them.
    for (let start = 0; start < 400; start += 20) {
      const batch = Array.from({ length: 20 }, (_, i) => status('invalid-token-'.repeat(2) + (start + i)))
      expect(await Promise.all(batch)).toEqual(Array(20).fill(401))
    }
    expect(await status(tokens[0])).toBe(429)
    expect(gateway.verify).toHaveBeenCalledTimes(1000)
  }, 30_000)

  it('rejects missing origins, unsupported media and oversized bodies', async () => {
    const gateway = mockGateway(), base = await listen(gateway)
    expect((await send(base, '/api/groups', orgToken, { eventId }, { Origin: '' })).status).toBe(403)
    expect((await send(base, '/api/groups', orgToken, { eventId }, { 'Content-Type': 'text/plain' })).status).toBe(415)
    expect((await send(base, '/api/groups', orgToken, { text: 'x'.repeat(9000) })).status).toBe(413)
    expect(gateway.create).not.toHaveBeenCalled()
  })

  it('rejects an oversized chunked body before the client ends the upload', async () => {
    const gateway = mockGateway(), base = await listen(gateway)
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(base + '/api/groups', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + orgToken, Origin: base, 'Content-Type': 'application/json' },
      }, res => {
        res.resume()
        res.once('end', () => { resolve(res.statusCode ?? 0); req.destroy() })
      })
      req.on('error', reject)
      req.setTimeout(2000, () => { req.destroy(new Error('Server waited for the entire oversized body')) })
      req.write('x'.repeat(9000))
    })
    expect(status).toBe(413)
    expect(gateway.create).not.toHaveBeenCalled()
  })

  it('reports Auth provider outages without invalidating a session', async () => {
    const gateway = { ...mockGateway(), verify: vi.fn(async () => {
      throw new GroupGatewayError(503, 'Authentication is temporarily unavailable.')
    }) }
    const base = await listen(gateway)
    expect((await send(base, '/api/groups')).status).toBe(503)
    expect(gateway.list).not.toHaveBeenCalled()
  })

  it('lists only explicit public summary fields, not participant roster data', async () => {
    const gateway = mockGateway(), base = await listen(gateway)
    const response = await send(base, '/api/groups')
    expect(response.status).toBe(200)
    const value = await response.json()
    expect(value).toEqual([{ id: planId, eventId, organizerId: orgId, status: 'proposed', revision: 2 }])
  })
})
