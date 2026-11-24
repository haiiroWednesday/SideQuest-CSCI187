import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmailAuthApi, type EmailOtpGateway } from '../server/emailAuthApi'

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
    signOut: vi.fn(async () => undefined),
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
      message: 'If this email is eligible, a verification code will arrive.',
    })
    expect(gateway.requestCode).toHaveBeenCalledWith('person@example.edu')
    expect(response.headers.get('cache-control')).toBe('no-store, private')
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

  it('rejects non-HTTP or noncanonical origins and invalid JSON media types', async () => {
    const gateway = sample(), base = await start(gateway)
    for (const origin of [base.replace('http:', 'ftp:'), base + '/path', base.replace('://', '://user@')]) {
      expect((await post(base, '/api/auth/request-code', { email: 'person@example.edu' }, origin)).status).toBe(403)
    }
    const wrongType = await fetch(base + '/api/auth/request-code', {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json-invalid' },
      body: JSON.stringify({ email: 'person@example.edu' }),
    })
    expect(wrongType.status).toBe(415)
    expect(gateway.requestCode).not.toHaveBeenCalled()
  })

  it('rejects oversized chunked OTP requests before the client finishes uploading', async () => {
    const gateway = sample(), base = await start(gateway)
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(base + '/api/auth/request-code', {
        method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
      }, res => {
        res.resume()
        res.once('end', () => { resolve(res.statusCode ?? 0); req.destroy() })
      })
      req.on('error', reject)
      req.setTimeout(2000, () => req.destroy(new Error('Server waited for the rest of the oversized body')))
      req.write('x'.repeat(2048))
    })
    expect(status).toBe(413)
    expect(gateway.requestCode).not.toHaveBeenCalled()
  })

  it('revokes only the supplied session and reports provider failure honestly', async () => {
    const gateway = sample(), base = await start(gateway)
    const token = 'example-access-token-for-unit-testing-only'
    const signOut = (body: unknown, authorization = 'Bearer ' + token, origin = base) =>
      fetch(base + '/api/auth/sign-out', {
        method: 'POST', headers: { Origin: origin, Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    expect((await signOut({}, '')).status).toBe(401)
    expect((await signOut({ scope: 'global' })).status).toBe(400)
    expect((await signOut({}, 'Bearer ' + token, 'https://unrelated.example')).status).toBe(403)
    expect(gateway.signOut).not.toHaveBeenCalled()
    const success = await signOut({})
    expect(success.status).toBe(200)
    expect(await success.json()).toEqual({ revoked: true })
    expect(success.headers.get('cache-control')).toBe('no-store, private')
    expect(gateway.signOut).toHaveBeenCalledWith(token)
    vi.mocked(gateway.signOut).mockRejectedValueOnce(new Error('Private provider failure'))
    const failure = await signOut({})
    expect(failure.status).toBe(503)
    expect(await failure.json()).toEqual({ error: 'The sign-in service is unavailable.' })
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
