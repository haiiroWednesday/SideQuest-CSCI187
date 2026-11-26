// Server hardening (security and perf critic reports): client IP behind a proxy, WebSocket caps,
// static serving with compression, caching and security headers, one shared handler list,
// a guard in front of Supabase Auth, the scu.edu rule everywhere, and the startup schema check.
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { createClient } from '@supabase/supabase-js'
import { clientIp, configureClientIp, requestIsHttps, trustedProxyHops } from '../server/clientIp'
import { attachCatalogRealtime, CATALOG_LIVE_PATH, IDLE_CLOSE_CODE, IDLE_LIMIT_MS, MAX_SUBSCRIBERS_PER_IP } from '../server/catalogRealtime'
import { createCatalogApi, POSTS_PER_MINUTE } from '../server/api'
import { CODE_REQUESTS_PER_EMAIL_PER_HOUR, createEmailAuthApi, publicOriginFromEnv, type EmailOtpGateway } from '../server/emailAuthApi'
import { createServerHandlers, runHandlers, type RequestHandler } from '../server/handlers'
import { IMMUTABLE, loadStaticSite, refineCompression, serveStatic } from '../server/staticFiles'
import { createPersonalApi, type PersonalGateway } from '../server/personalApi'
import { createMemorySocialStore, createSocialApi } from '../server/socialApi'
import { supabaseIdentityFromEnv } from '../server/googleApi'
import { AUTH_CHECKS_PER_IP_PER_MINUTE } from '../server/verifiedTokens'
import { createEventCatalog, type EventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { createSupabaseEventTable } from '../src/model/supabaseEventTable'
import { campusDateFromToday } from './fixtures/campusDates'

const servers: Server[] = []
const sockets: WebSocket[] = []
// Upgraded and passed-through sockets are no longer tracked by the HTTP server, so close them here.
const connections = new Set<import('node:net').Socket>()
afterEach(async () => {
  configureClientIp({})
  vi.unstubAllGlobals()
  sockets.splice(0).forEach(socket => socket.terminate())
  for (const socket of connections) socket.destroy()
  connections.clear()
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections?.()
    server.close(() => resolve())
  })))
})

async function listen(handler: RequestHandler, setup?: (server: Server) => void) {
  const server = createServer((req, res) => { void handler(req, res).then(done => { if (!done) { res.statusCode = 404; res.end() } }) })
  setup?.(server)
  server.on('connection', socket => { connections.add(socket); socket.once('close', () => connections.delete(socket)) })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return 'http://127.0.0.1:' + (server.address() as AddressInfo).port
}

const fakeReq = (remote: string, headers: Record<string, string> = {}) =>
  ({ socket: { remoteAddress: remote }, headers }) as unknown as IncomingMessage

describe('client IP for rate limits (SIDEQUEST_TRUST_PROXY)', () => {
  it('uses the TCP peer unless the proxy is trusted, then the right-most X-Forwarded-For entry', () => {
    const req = fakeReq('10.0.0.5', { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })
    expect(clientIp(req, 0)).toBe('10.0.0.5')
    // A client can put anything on the left; the platform appends the real address on the right.
    expect(clientIp(req, 1)).toBe('203.0.113.9')
    expect(clientIp(req, 2)).toBe('6.6.6.6')
    expect(clientIp(fakeReq('10.0.0.5', { 'x-forwarded-for': 'not-an-ip' }), 1)).toBe('10.0.0.5')
    expect(clientIp(fakeReq('::ffff:192.0.2.1'), 0)).toBe('192.0.2.1')
    expect(trustedProxyHops({ SIDEQUEST_TRUST_PROXY: 'true' })).toBe(1)
    expect(trustedProxyHops({ SIDEQUEST_TRUST_PROXY: '2' })).toBe(2)
    expect(trustedProxyHops({})).toBe(0)
    expect(requestIsHttps(fakeReq('10.0.0.5', { 'x-forwarded-proto': 'https' }), 0)).toBe(false)
    expect(requestIsHttps(fakeReq('10.0.0.5', { 'x-forwarded-proto': 'https' }), 1)).toBe(true)
  })

  it('gives each student behind the proxy their own catalog posting bucket', async () => {
    configureClientIp({ SIDEQUEST_TRUST_PROXY: 'true' })
    const base = await listen(createCatalogApi(createEventCatalog(createInMemoryEventTable())))
    const draft = {
      title: 'Proxy test', hostName: 'SCU Club', description: 'One bucket each.', location: 'Benson',
      date: campusDateFromToday(30), start: '14:30', end: '15:30', organizer: 'Ana Ruiz', contact: 'ana@scu.edu', spaceConfirmed: true,
    }
    const post = (ip: string) => fetch(base + '/api/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(draft),
    })
    for (let i = 0; i < POSTS_PER_MINUTE; i++) expect((await post('198.51.100.1')).status).toBe(201)
    expect((await post('198.51.100.1')).status).toBe(429)
    expect((await post('198.51.100.2')).status).toBe(201)
  })
})

describe('email sign-in limits and the public origin', () => {
  const gateway = (): EmailOtpGateway => ({ requestCode: vi.fn(async () => undefined), verifyCode: vi.fn(async () => null) })
  const ask = (base: string, email: string, headers: Record<string, string> = {}) => fetch(base + '/api/auth/request-code', {
    method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ email }),
  })

  it(`sends one address at most ${CODE_REQUESTS_PER_EMAIL_PER_HOUR} emails an hour, from any number of IPs`, async () => {
    configureClientIp({ SIDEQUEST_TRUST_PROXY: 'true' })
    const g = gateway(), base = await listen(createEmailAuthApi(g))
    const from = (n: number) => ({ 'X-Forwarded-For': `198.51.100.${n}` })
    const statuses: number[] = []
    for (let i = 0; i < CODE_REQUESTS_PER_EMAIL_PER_HOUR + 1; i++) statuses.push((await ask(base, 'target@scu.edu', from(i))).status)
    expect(statuses.slice(0, -1).every(code => code === 200)).toBe(true)
    expect(statuses.at(-1)).toBe(429)
    expect(g.requestCode).toHaveBeenCalledTimes(CODE_REQUESTS_PER_EMAIL_PER_HOUR)
    // Another address is unaffected.
    expect((await ask(base, 'other@scu.edu', from(99))).status).toBe(200)
  })

  it('drops the oldest counters when the table is full instead of refusing everyone', async () => {
    const api = createEmailAuthApi(gateway())
    const call = async (email: string) => {
      const body = Buffer.from(JSON.stringify({ email }))
      const req = Object.assign((async function* () { yield body })(), {
        url: '/api/auth/request-code', method: 'POST', socket: { remoteAddress: '192.0.2.10' },
        headers: { origin: 'http://sq.test', host: 'sq.test', 'content-type': 'application/json' },
      }) as unknown as IncomingMessage
      let status = 0
      const res = { writeHead(code: number) { status = code; return res }, end() { return res } }
      await api(req, res as never)
      return status
    }
    // 10 000 new addresses fill the counter table however many counters each one adds.
    for (let i = 0; i < 10_000; i++) await call(`student${i}@scu.edu`)
    expect(await call('newcomer@scu.edu')).toBe(200)
  }, 60_000)

  it('accepts only SIDEQUEST_PUBLIC_ORIGIN when set, and sends sign-in links there', async () => {
    expect(publicOriginFromEnv({ SIDEQUEST_PUBLIC_ORIGIN: 'https://sidequest.example/path' })).toBe('https://sidequest.example')
    expect(publicOriginFromEnv({ SIDEQUEST_PUBLIC_ORIGIN: 'javascript:alert(1)' })).toBeUndefined()
    expect(publicOriginFromEnv({})).toBeUndefined()
    const g = gateway()
    const base = await listen(createEmailAuthApi(g, Date.now, undefined, undefined, { publicOrigin: 'https://sidequest.example' }))
    // Origin matching the Host header is no longer enough.
    expect((await ask(base, 'a@scu.edu')).status).toBe(403)
    expect((await ask(base, 'a@scu.edu', { Origin: 'https://sidequest.example' })).status).toBe(200)
    expect(g.requestCode).toHaveBeenCalledWith('a@scu.edu', 'https://sidequest.example')
  })
})

describe('catalog WebSocket caps', () => {
  async function hub(options: Parameters<typeof attachCatalogRealtime>[1] = {}) {
    let realtime: ReturnType<typeof attachCatalogRealtime> | null = null
    const base = await listen(async () => false, server => { realtime = attachCatalogRealtime(server, options) })
    const origin = base
    const open = (path = CATALOG_LIVE_PATH) => {
      const socket = new WebSocket(base.replace('http:', 'ws:') + path, { origin })
      sockets.push(socket)
      return new Promise<{ socket: WebSocket; status: number | 'open' | 'closed' }>(resolve => {
        socket.once('open', () => resolve({ socket, status: 'open' }))
        socket.once('unexpected-response', (_req, response) => resolve({ socket, status: response.statusCode ?? 0 }))
        socket.once('error', () => resolve({ socket, status: 'closed' }))
      })
    }
    return { open, realtime: () => realtime! }
  }
  const within = <T>(ms: number, promise: Promise<T>) =>
    Promise.race([promise, new Promise<'still waiting'>(resolve => setTimeout(() => resolve('still waiting'), ms))])

  it('destroys an upgrade for any other path in production, and leaves it for Vite in development', async () => {
    const production = await hub()
    expect(await within(1000, production.open('/not-the-catalog').then(r => r.status))).toBe('closed')
    const development = await hub({ passThroughOtherUpgrades: true })
    expect(await within(300, development.open('/vite-hmr').then(r => r.status))).toBe('still waiting')
  })

  it(`lets one IP hold ${MAX_SUBSCRIBERS_PER_IP} live sockets, and frees a slot when one closes`, async () => {
    const h = await hub()
    const opened: { socket: WebSocket; status: number | 'open' | 'closed' }[] = []
    for (let i = 0; i < MAX_SUBSCRIBERS_PER_IP; i++) opened.push(await h.open())
    expect(opened.every(r => r.status === 'open')).toBe(true)
    expect((await h.open()).status).toBe(429)
    const closed = new Promise(resolve => opened[0].socket.once('close', resolve))
    opened[0].socket.close()
    await closed
    await new Promise(resolve => setTimeout(resolve, 50))
    expect((await h.open()).status).toBe('open')
  })

  it('closes a socket that has been sent nothing for the idle limit', async () => {
    let now = 1_000_000
    const h = await hub({ clock: () => now, pingIntervalMs: 20 })
    const { socket, status } = await h.open()
    expect(status).toBe('open')
    const code = new Promise<number>(resolve => socket.once('close', resolve))
    // A message resets the idle clock.
    now += IDLE_LIMIT_MS - 1
    h.realtime().publish('11111111-1111-4111-8111-111111111111')
    now += IDLE_LIMIT_MS - 1
    expect(await within(150, code)).toBe('still waiting')
    now += 2
    expect(await within(1000, code)).toBe(IDLE_CLOSE_CODE)
  })
})

describe('static files from memory', () => {
  const inline = 'console.log("map")'
  const bundle = 'export const x = 1;\n'.repeat(400)
  let dir = ''
  afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); dir = '' })
  function site(refine = false) {
    dir = mkdtempSync(join(tmpdir(), 'sq-static-'))
    mkdirSync(join(dir, 'assets')); mkdirSync(join(dir, 'map'))
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>SideQuest</title><script type="module" src="/assets/app-abc.js"></script>' + '<!-- pad -->'.repeat(60))
    writeFileSync(join(dir, 'assets', 'app-abc.js'), bundle)
    writeFileSync(join(dir, 'map', 'index.html'), `<!doctype html><style>p{}</style><script>${inline}</script>`)
    writeFileSync(join(dir, 'map', 'data.json'), JSON.stringify({ places: Array(200).fill('Benson') }))
    writeFileSync(join(dir, 'photo.webp'), Buffer.from([1, 2, 3]))
    const loaded = loadStaticSite(dir)
    const ready = refine ? refineCompression(loaded) : Promise.resolve()
    return ready.then(() => listen(async (req, res) => { serveStatic(loaded, req, res); return true }))
  }
  const raw = (url: string, headers: Record<string, string> = {}) => new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>((resolve, reject) => {
    // node:http so Accept-Encoding is exactly what the test says (fetch adds its own).
    import('node:http').then(({ get }) => get(url, { headers }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) }))
    }).on('error', reject))
  })

  it('serves brotli or gzip by Accept-Encoding, and caches hashed assets for a year', async () => {
    const base = await site()
    const br = await raw(base + '/assets/app-abc.js', { 'Accept-Encoding': 'gzip, br' })
    expect(br.headers['content-encoding']).toBe('br')
    expect(brotliDecompressSync(br.body).toString()).toBe(bundle)
    expect(br.headers['cache-control']).toBe(IMMUTABLE)
    expect(br.headers.vary).toBe('Accept-Encoding')
    const gz = await raw(base + '/assets/app-abc.js', { 'Accept-Encoding': 'gzip' })
    expect(gz.headers['content-encoding']).toBe('gzip')
    expect(gunzipSync(gz.body).toString()).toBe(bundle)
    const plain = await raw(base + '/assets/app-abc.js', { 'Accept-Encoding': 'br;q=0' })
    expect(plain.headers['content-encoding']).toBeUndefined()
    expect(plain.body.toString()).toBe(bundle)
    expect(plain.headers['content-type']).toBe('text/javascript; charset=utf-8')
  })

  it('keeps serving the same bytes after brotli is redone at the best quality', async () => {
    const base = await site(true)
    const br = await raw(base + '/assets/app-abc.js', { 'Accept-Encoding': 'br' })
    expect(br.headers['content-encoding']).toBe('br')
    expect(brotliDecompressSync(br.body).toString()).toBe(bundle)
  })

  it('re-checks index.html and the map with an ETag, and answers 304 when unchanged', async () => {
    const base = await site()
    for (const path of ['/', '/index.html', '/map/index.html', '/map/data.json']) {
      const first = await raw(base + path, { 'Accept-Encoding': 'br' })
      expect(first.headers['cache-control'], path).toBe('no-cache')
      const etag = String(first.headers.etag)
      expect(etag).toMatch(/^".+"$/)
      const again = await raw(base + path, { 'Accept-Encoding': 'br', 'If-None-Match': etag })
      expect(again.status, path).toBe(304)
      expect(again.body.length).toBe(0)
    }
    expect((await raw(base + '/map/data.json')).headers['content-type']).toBe('application/json; charset=utf-8')
    expect((await raw(base + '/photo.webp')).headers['content-type']).toBe('image/webp')
    expect((await raw(base + '/missing.js')).status).toBe(404)
    expect((await raw(base + '/%2e%2e/package.json')).status).toBe(404)
  })

  it('puts a CSP and framing rules on HTML, with the page\'s own inline script hash, and HSTS only over HTTPS', async () => {
    const base = await site()
    const map = await raw(base + '/map/index.html')
    const csp = String(map.headers['content-security-policy'])
    const hash = createHash('sha256').update(inline).digest('base64')
    expect(csp).toContain(`script-src 'self' 'sha256-${hash}'`)
    for (const rule of ["default-src 'self'", "frame-ancestors 'self'", "frame-src 'self'", "img-src 'self' data:", "object-src 'none'"]) expect(csp).toContain(rule)
    expect(csp).toContain(`ws://${new URL(base).host}`)
    expect(map.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(map.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(map.headers['strict-transport-security']).toBeUndefined()
    expect((await raw(base + '/assets/app-abc.js')).headers['content-security-policy']).toBeUndefined()
    // Behind a trusted proxy that says the browser used HTTPS.
    configureClientIp({ SIDEQUEST_TRUST_PROXY: 'true' })
    const secure = await raw(base + '/', { 'X-Forwarded-Proto': 'https' })
    expect(secure.headers['strict-transport-security']).toBe('max-age=31536000')
  })
})

describe('one handler list for both servers', () => {
  it('includes the social and Google routes the dev server used to miss', async () => {
    const handlers = createServerHandlers({}, { catalog: null })
    expect(handlers.map(h => h.name)).toEqual(['auth', 'personal', 'google', 'social', 'groups', 'ai', 'catalog'])
    const base = await listen((req, res) => runHandlers(handlers, req, res))
    expect(await (await fetch(base + '/api/social/status')).json()).toEqual({ enabled: false })
    const google = await fetch(base + '/api/google/status')
    expect(google.status).toBe(200)
    expect(await google.json()).toMatchObject({ routes: { enabled: false } })
    expect((await fetch(base + '/no-such-page')).status).toBe(404) // left for static files
  })
})

describe('Supabase Auth is asked once per token per 30 s, within a per-IP budget', () => {
  const user = '11111111-1111-4111-8111-111111111111'
  const token = 'live-session-token-for-tests-only'

  it('for /api/me', async () => {
    let checks = 0
    const gateway: PersonalGateway = {
      async userFor(t) { checks++; return t === token ? user : null },
      storeFor() { return { load: async () => ({ profile: null, plans: [], ideas: [], busy: [] }) } as never },
    }
    const base = await listen(createPersonalApi(gateway))
    const me = (t: string) => fetch(base + '/api/me', { headers: { Authorization: `Bearer ${t}` } })
    for (let i = 0; i < 4; i++) expect((await me(token)).status).toBe(200)
    expect(checks).toBe(1)
    const codes: number[] = []
    for (let i = 0; i < AUTH_CHECKS_PER_IP_PER_MINUTE + 5; i++) codes.push((await me(`made-up-token-${String(i).padStart(8, '0')}`)).status)
    expect(codes).toContain(429)
    expect(checks).toBeLessThanOrEqual(AUTH_CHECKS_PER_IP_PER_MINUTE)
  })

  it('for /api/social', async () => {
    const store = createMemorySocialStore([], { [token]: 'you' })
    let checks = 0
    const userFor = store.userFor.bind(store)
    store.userFor = async t => { checks++; return userFor(t) }
    const base = await listen(createSocialApi(store))
    for (let i = 0; i < 3; i++) expect((await fetch(base + '/api/social/invites', { headers: { Authorization: `Bearer ${token}` } })).status).toBe(200)
    expect(checks).toBe(1)
  })
})

describe('the scu.edu rule on every Supabase session check', () => {
  it('Google identity refuses a live token whose address is outside the policy', async () => {
    const emails: Record<string, string> = { 'outside-token-for-tests-only': 'someone@gmail.com', 'campus-token-for-tests-only': 'cyn@scu.edu' }
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).get('authorization') ?? ''
      const email = emails[auth.replace('Bearer ', '')]
      return new Response(JSON.stringify({ id: '22222222-2222-4222-8222-222222222222', aud: 'authenticated', email }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const identity = supabaseIdentityFromEnv({ SUPABASE_URL: 'https://sq.supabase.test', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' })!
    expect(await identity.verify('campus-token-for-tests-only')).toEqual({ userId: '22222222-2222-4222-8222-222222222222' })
    expect(await identity.verify('outside-token-for-tests-only')).toBeNull()
  })
})

describe('startup schema check for public.events', () => {
  it('reports missing columns once, before any post, and later posts skip the failed insert', async () => {
    const methods: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      const select = new URL(request.url).searchParams.get('select') ?? ''
      methods.push(request.method)
      const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
      if (/organizer|contact/.test(select)) return reply({ code: '42703', message: 'column events.organizer does not exist' }, 400)
      if (/tags/.test(select)) return reply({ code: '42703', message: 'column events.tags does not exist' }, 400)
      if (request.method === 'POST') {
        const body = await request.json() as Omit<EventRow, 'id'>
        return reply({ ...body, id: '22222222-2222-4222-8222-222222222222', start_time: '14:30:00', end_time: '15:30:00' }, 201)
      }
      return reply([])
    })
    const warn = vi.fn()
    const table = createSupabaseEventTable(createClient('https://sidequest-http.test', 'sb_publishable_fixture', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    }), warn)
    expect(await table.checkSchema()).toEqual({ access: false, tags: false, attend: true })
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls.every(([message]) => /^Schema check: /.test(message))).toBe(true)
    methods.length = 0
    const NOW = new Date('2030-11-07T17:00:00Z')
    const created = await createEventCatalog(table, () => NOW).create({
      title: 'Photo Walk', hostName: 'Art Club', description: 'Bring a camera.', location: 'Library',
      date: '2030-11-14', start: '14:30', end: '15:30', organizer: 'Ana Ruiz', contact: 'ana@scu.edu', spaceConfirmed: true,
    })
    expect(created.title).toBe('Photo Walk')
    expect(methods).toEqual(['POST']) // one insert, no refused-then-retried attempt
    expect(warn).toHaveBeenCalledTimes(2)
  })
})
