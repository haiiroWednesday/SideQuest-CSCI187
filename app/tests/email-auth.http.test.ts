import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmailAuthApi, EmailSendError, type EmailOtpGateway } from '../server/emailAuthApi'

const actorId = '11111111-1111-4111-8111-111111111111'
const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve()))
  }
})
async function start(gateway: EmailOtpGateway | null) {
  const api = createEmailAuthApi(gateway)
  const server = createServer((req, res) => {
    void api(req, res).then(handled => {
      if (!handled) { res.statusCode = 404; res.end() }
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  servers.push(server)
  return 'http://127.0.0.1:' + (server.address() as AddressInfo).port
}
function sample(): EmailOtpGateway {
  return {
    requestCode: vi.fn(async () => undefined),
    verifyCode: vi.fn(async (_email, code) => code === '123456' ? {
      userId: actorId,
      accessToken: 'example-access-token-for-unit-testing-only',
      expiresAt: Date.now() + 3600000,
    } : null),
  }
}
function post(base: string, path: string, body: unknown, origin = base) {
  return fetch(base + path, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('passwordless email-code HTTP contract', () => {
  it('advertises a disabled sign-in when no gateway is configured', async () => {
    const base = await start(null)
    expect(await (await fetch(base + '/api/auth/status')).json()).toEqual({ enabled: false })
    expect((await post(base, '/api/auth/request-code', { email: 'person@example.edu' })).status).toBe(503)
  })
  it('requests a code without disclosing whether an account exists', async () => {
    const gateway = sample(), base = await start(gateway)
    expect(await (await fetch(base + '/api/auth/status')).json()).toEqual({ enabled: true })
    const response = await post(base, '/api/auth/request-code', { email: ' Person@Example.edu ' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: 'If this email can sign in, a code is on its way.',
    })
    expect(gateway.requestCode).toHaveBeenCalledWith('person@example.edu', base)
    expect(response.headers.get('cache-control')).toBe('no-store, private')
  })
  it('says so when the email provider hit its limit or is down, instead of claiming an email left', async () => {
    const limited = sample()
    limited.requestCode = vi.fn(async () => { throw new EmailSendError('limit') })
    const limitedBase = await start(limited)
    const tooMany = await post(limitedBase, '/api/auth/request-code', { email: 'person@example.edu' })
    expect(tooMany.status).toBe(429)
    expect((await tooMany.json()).error).toBe('The email limit was reached. Try again in an hour.')
    const down = sample()
    down.requestCode = vi.fn(async () => { throw new EmailSendError('outage') })
    const failed = await post(await start(down), '/api/auth/request-code', { email: 'person@example.edu' })
    expect(failed.status).toBe(503)
    expect((await failed.json()).error).toBe('The email did not send. Try again in a few minutes.')
  })
  it('keeps other refusals generic so nobody learns whether an account exists', async () => {
    const refusing = sample()
    refusing.requestCode = vi.fn(async () => { throw Error('Signups not allowed for otp') })
    const response = await post(await start(refusing), '/api/auth/request-code', { email: 'stranger@example.edu' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message: 'If this email can sign in, a code is on its way.' })
  })
  it('verifies an issued code and never accepts a supplied account identity', async () => {
    const gateway = sample(), base = await start(gateway)
    expect((await post(base, '/api/auth/verify-code', {
      email: 'person@example.edu', code: '123456', userId: actorId,
    })).status).toBe(400)
    expect((await post(base, '/api/auth/verify-code', {
      email: 'person@example.edu', code: 'abc',
    })).status).toBe(400)
    const ok = await post(base, '/api/auth/verify-code', {
      email: 'person@example.edu', code: '123456',
    })
    expect(ok.status).toBe(200)
    const session = await ok.json()
    expect(session.userId).toBe(actorId)
    expect(session.expiresAt).toBeGreaterThan(Date.now())
    expect(gateway.verifyCode).toHaveBeenCalledWith('person@example.edu', '123456')
  })

  it('rejects cross-origin requests without invoking the provider', async () => {
    const gateway = sample(), base = await start(gateway)
    const denied = await post(base, '/api/auth/request-code',
      { email: 'person@example.edu' }, 'https://unrelated.example')
    expect(denied.status).toBe(403)
    expect(gateway.requestCode).not.toHaveBeenCalled()
  })

  it('caps repeated verification attempts and does not report invalid codes as sessions', async () => {
    const gateway = sample(), base = await start(gateway)
    for (let i = 0; i < 10; i++) {
      const result = await post(base, '/api/auth/verify-code',
        { email: 'person@example.edu', code: '000000' })
      expect(result.status).toBe(401)
    }
    const limited = await post(base, '/api/auth/verify-code',
      { email: 'person@example.edu', code: '123456' })
    expect(limited.status).toBe(429)
  })
})

describe('sign-in link: POST /api/auth/link-session', () => {
  const linkToken = 'link-access-token-from-the-address-for-tests'
  function withLink(): EmailOtpGateway {
    return {
      ...sample(),
      sessionFromLink: vi.fn(async (token: string) => token === linkToken
        ? { userId: actorId, accessToken: token, expiresAt: Date.now() + 3600000 } : null),
    }
  }
  it('returns the session for a token Supabase Auth accepts', async () => {
    const gateway = withLink(), base = await start(gateway)
    const ok = await post(base, '/api/auth/link-session', { accessToken: linkToken })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ userId: actorId, accessToken: linkToken })
    expect(gateway.sessionFromLink).toHaveBeenCalledWith(linkToken)
  })
  it('refuses a token Supabase Auth does not accept, and anything extra', async () => {
    const gateway = withLink(), base = await start(gateway)
    expect((await post(base, '/api/auth/link-session', { accessToken: 'made-up-token-that-is-long-enough' })).status).toBe(401)
    expect((await post(base, '/api/auth/link-session', { accessToken: linkToken, userId: actorId })).status).toBe(400)
    expect((await post(base, '/api/auth/link-session', { accessToken: 'short' })).status).toBe(400)
  })
  it('refuses a link session started from another site', async () => {
    const gateway = withLink(), base = await start(gateway)
    expect((await post(base, '/api/auth/link-session', { accessToken: linkToken }, 'https://unrelated.example')).status).toBe(403)
    expect(gateway.sessionFromLink).not.toHaveBeenCalled()
  })
  it('refuses link sign-in when the provider cannot check links', async () => {
    const base = await start(sample())
    expect((await post(base, '/api/auth/link-session', { accessToken: linkToken })).status).toBe(400)
  })
})
