import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmailAuthApi, type EmailOtpGateway } from '../server/emailAuthApi'
import { createSignInPolicy } from '../server/signInPolicy'

// Campus events are for the SCU community (BroncosGo thesis, 7.1.4): accounts are Santa Clara addresses.

describe('sign-in policy', () => {
  const scu = createSignInPolicy({})
  it('allows scu.edu and its subdomains by default', () => {
    expect(scu.allows('cyn@scu.edu')).toBe(true)
    expect(scu.allows(' Cyn@SCU.edu ')).toBe(true)
    expect(scu.allows('old@alumni.scu.edu')).toBe(true)
    expect(scu.message).toBe('Use your Santa Clara email (@scu.edu).')
  })
  it('refuses other domains and look-alikes', () => {
    for (const email of ['cyn@gmail.com', 'cyn@notscu.edu', 'cyn@scu.edu.evil.com', 'scu.edu@gmail.com', '@scu.edu', 'cyn@', '', null, undefined]) {
      expect(scu.allows(email)).toBe(false)
    }
  })
  it('takes named test addresses and other domains only when configured', () => {
    const staging = createSignInPolicy({ SIDEQUEST_AUTH_ALLOWED_EMAILS: 'tester@example.com', SIDEQUEST_AUTH_ALLOWED_DOMAINS: 'scu.edu, law.scu.edu' })
    expect(staging.allows('tester@example.com')).toBe(true)
    expect(staging.allows('other@example.com')).toBe(false)
    expect(staging.allows('a@law.scu.edu')).toBe(true)
  })
})

const actorId = '11111111-1111-4111-8111-111111111111'
const token = 'example-access-token-for-unit-testing-only'
const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>(resolve => server.close(() => resolve()))
})
async function start(gateway: EmailOtpGateway) {
  let api: ReturnType<typeof createEmailAuthApi>
  const server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.statusCode = 404; res.end() } }) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  servers.push(server)
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  api = createEmailAuthApi(gateway, Date.now, undefined, createSignInPolicy({}), { publicOrigin: base })
  return base
}
const post = (base: string, path: string, body: unknown) => fetch(base + path, {
  method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
function gatewayFor(email: string): EmailOtpGateway {
  const session = { userId: actorId, email, accessToken: token, expiresAt: Date.now() + 3600000 }
  return {
    requestCode: vi.fn(async () => undefined),
    verifyCode: vi.fn(async () => session),
    sessionFromLink: vi.fn(async () => session),
  }
}

describe('sign-in API with the Santa Clara policy', () => {
  it('sends no email to an outside address and says which address to use', async () => {
    const gateway = gatewayFor('cyn@gmail.com'), base = await start(gateway)
    const response = await post(base, '/api/auth/request-code', { email: 'cyn@gmail.com' })
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Use your Santa Clara email (@scu.edu).' })
    expect(gateway.requestCode).not.toHaveBeenCalled()
  })
  it('sends the email for a Santa Clara address', async () => {
    const gateway = gatewayFor('cyn@scu.edu'), base = await start(gateway)
    expect((await post(base, '/api/auth/request-code', { email: 'cyn@scu.edu' })).status).toBe(200)
    expect(gateway.requestCode).toHaveBeenCalledWith('cyn@scu.edu', base)
  })
  it('refuses a sign-in link whose account is outside the policy', async () => {
    const base = await start(gatewayFor('cyn@gmail.com'))
    const response = await post(base, '/api/auth/link-session', { accessToken: token })
    expect(response.status).toBe(403)
    expect(JSON.stringify(await response.json())).not.toContain(token)
  })
  it('accepts a sign-in link for a Santa Clara account', async () => {
    const base = await start(gatewayFor('cyn@scu.edu'))
    const response = await post(base, '/api/auth/link-session', { accessToken: token })
    expect(response.status).toBe(200)
    expect((await response.json()).userId).toBe(actorId)
  })
  it('refuses a code whose account turns out to be outside the policy', async () => {
    const base = await start(gatewayFor('someone@gmail.com'))
    const response = await post(base, '/api/auth/verify-code', { email: 'cyn@scu.edu', code: '123456' })
    expect(response.status).toBe(403)
  })
})
