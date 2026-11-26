import { randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createGoogleApi } from '../server/googleApi'
import {
  SCOPE_EVENTS, SCOPE_FREEBUSY, createGoogleCalendarService, memoryConnectionStore, memoryPlanLinkStore,
  type CalendarBusyStore, type SessionIdentity,
} from '../server/googleCalendar'
import { createGoogleRoutesService } from '../server/googleRoutes'

const user = '11111111-1111-4111-8111-111111111111'
const session = 'sidequest-session-token-for-tests-only'
const ACCESS = 'ya29.secret-google-access-token'
const REFRESH = '1//secret-google-refresh-token'
const KEY = 'test-maps-server-key-0123456789'
const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>(r => server.close(() => r()))
})

const identity: SessionIdentity = { async verify(token) { return token === session ? { userId: user } : null } }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })

async function start(on: boolean) {
  const googleCalls: string[] = []
  const fetch = async (url: string) => {
    googleCalls.push(url)
    if (url.endsWith('/token')) return json({ access_token: ACCESS, refresh_token: REFRESH, expires_in: 3600, scope: `${SCOPE_FREEBUSY} ${SCOPE_EVENTS}` })
    if (url.endsWith('/freeBusy')) return json({ calendars: { primary: { busy: [{ start: '2026-11-25T18:00:00Z', end: '2026-11-25T19:00:00Z' }] } } })
    if (url.endsWith('/revoke')) return new Response(null, { status: 200 })
    if (url.includes('computeRoutes')) return json({ routes: [{ duration: '300s', distanceMeters: 400, polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC' } }] })
    throw new Error('unexpected ' + url)
  }
  const busyRows: unknown[] = []
  const busy: CalendarBusyStore = {
    async replace(_t, _f, _to, blocks) { busyRows.splice(0, busyRows.length, ...blocks) },
    async removeAll() { busyRows.splice(0) },
  }
  const connections = memoryConnectionStore()
  const calendar = createGoogleCalendarService({
    config: on ? { clientId: 'cid', clientSecret: 'csecret', redirectUri: 'https://sq.example/api/google/calendar/callback', sealKey: randomBytes(32) } : null,
    identity, connections, links: memoryPlanLinkStore(), busy, fetch,
  })
  const routes = createGoogleRoutesService(on ? { apiKey: KEY, placesEnabled: false } : null, { fetch })
  const api = createGoogleApi(calendar, routes, identity)
  const server = createServer((req, res) => { void api(req, res).then(done => { if (!done) { res.statusCode = 404; res.end() } }) })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  servers.push(server)
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  const post = (path: string, body: unknown, opts: { origin?: string; token?: string | null } = {}) => fetch_(base + path, {
    method: 'POST',
    headers: {
      Origin: opts.origin ?? base, 'Content-Type': 'application/json',
      ...(opts.token === null ? {} : { Authorization: `Bearer ${opts.token ?? session}` }),
    },
    body: JSON.stringify(body),
  })
  return { base, post, googleCalls, busyRows, connections }
}
const fetch_ = (url: string, init?: RequestInit) => fetch(url, { redirect: 'manual', ...init })

describe('Google HTTP routes', () => {
  it('reports everything off and answers not_enabled while the flags are off', async () => {
    const s = await start(false)
    expect(await (await fetch_(s.base + '/api/google/status')).json()).toEqual({
      calendar: { enabled: false, connected: false, exportEnabled: false },
      routes: { enabled: false }, places: { enabled: false },
    })
    const connect = await s.post('/api/google/calendar/connect', {})
    expect(connect.status).toBe(503)
    expect(await connect.json()).toEqual({ error: 'Google Calendar is not enabled.', code: 'not_enabled' })
    const route = await s.post('/api/google/route', { from: { lat: 37.3494, lng: -121.9405 }, to: { lat: 37.3528, lng: -121.9361 } })
    expect((await route.json()).code).toBe('not_enabled')
    const callback = await fetch_(s.base + '/api/google/calendar/callback?state=x&code=y')
    expect(callback.headers.get('location')).toBe('/#google/off')
    expect(s.googleCalls).toHaveLength(0)
  })

  it('sends a forged callback back to SideQuest without touching Google', async () => {
    const s = await start(true)
    await s.post('/api/google/calendar/connect', {})
    const callback = await fetch_(s.base + '/api/google/calendar/callback?state=forged&code=stolen')
    expect(callback.status).toBe(303)
    expect(callback.headers.get('location')).toBe('/#google/failed')
    expect(s.googleCalls).toHaveLength(0)
  })

  it('connects, imports and disconnects without a Google token ever reaching the browser', async () => {
    const s = await start(true)
    const bodies: string[] = []
    const connect = await s.post('/api/google/calendar/connect', { export: true })
    const text = await connect.text()
    bodies.push(text)
    const state = new URL(JSON.parse(text).authorizeUrl).searchParams.get('state')!
    const back = await fetch_(`${s.base}/api/google/calendar/callback?state=${state}&code=good-code`)
    expect(back.headers.get('location')).toBe('/#google/connected')
    expect(back.headers.get('set-cookie')).toBeNull()
    bodies.push(await back.text())
    const status = await fetch_(s.base + '/api/google/status', { headers: { Authorization: `Bearer ${session}` } })
    const statusText = await status.text()
    bodies.push(statusText)
    expect(JSON.parse(statusText).calendar).toEqual({ enabled: true, connected: true, exportEnabled: true })
    const imported = await s.post('/api/google/calendar/import', { from: '2026-11-24', to: '2026-11-30' })
    const importText = await imported.text()
    bodies.push(importText)
    expect(JSON.parse(importText)).toEqual({ blocks: [{ date: '2026-11-25', start: '10:00', end: '11:00' }] })
    expect(s.busyRows).toHaveLength(1)
    const gone = await s.post('/api/google/calendar/disconnect', {})
    bodies.push(await gone.text())
    expect(gone.status).toBe(200)
    expect(s.busyRows).toHaveLength(0)
    expect(s.connections.rows.size).toBe(0)
    for (const body of bodies) {
      expect(body).not.toContain(ACCESS)
      expect(body).not.toContain(REFRESH)
      expect(body).not.toContain('csecret')
    }
  })

  it('needs a signed-in SideQuest session and a same-origin page', async () => {
    const s = await start(true)
    expect((await s.post('/api/google/calendar/connect', {}, { token: null })).status).toBe(401)
    expect((await s.post('/api/google/calendar/connect', {}, { token: 'someone-elses-made-up-token' })).status).toBe(401)
    expect((await s.post('/api/google/calendar/connect', {}, { origin: 'https://evil.example' })).status).toBe(403)
  })

  it('requires a verified account for the strict Calendar status check', async () => {
    const s = await start(true)
    const url = s.base + '/api/google/status?session=required'
    expect((await fetch_(url)).status).toBe(401)
    expect((await fetch_(url, { headers: { Authorization: 'Bearer invalid-sidequest-session' } })).status).toBe(401)
    const initial = await fetch_(url, { headers: { Authorization: 'Bearer ' + session } })
    expect((await initial.json()).calendar.connected).toBe(false)
    const connect = await s.post('/api/google/calendar/connect', {})
    const state = new URL((await connect.json()).authorizeUrl).searchParams.get('state')
    await fetch_(s.base + '/api/google/calendar/callback?state=' + state + '&code=good-code')
    expect((await fetch_(url)).status).toBe(401)
    const checked = await fetch_(url, { headers: { Authorization: 'Bearer ' + session } })
    expect((await checked.json()).calendar.connected).toBe(true)
    expect(checked.headers.get('cache-control')).toContain('no-store')
  })

  it('validates plan changes before anything reaches Google', async () => {
    const s = await start(true)
    const bad = await s.post('/api/google/calendar/plans', { action: 'upsert', planId: 'p1', event: { title: 'x', date: '2026-11-26', start: '20:00', end: '19:00' } })
    expect(bad.status).toBe(400)
    expect(s.googleCalls).toHaveLength(0)
  })

  it('serves Google walking routes near campus and refuses far ones', async () => {
    const s = await start(true)
    const ok = await s.post('/api/google/route', { from: { lat: 37.3494, lng: -121.9405 }, to: { lat: 37.3528, lng: -121.9361 } })
    const route = await ok.json()
    expect(route.label).toBe('Google route, not checked on foot')
    expect(JSON.stringify(route)).not.toContain(KEY)
    const far = await s.post('/api/google/route', { from: { lat: 37.3494, lng: -121.9405 }, to: { lat: 37.7749, lng: -122.4194 } })
    expect(far.status).toBe(422)
  })

  it('serves routes and place details only to a signed-in SideQuest session', async () => {
    const s = await start(true)
    const body = { from: { lat: 37.3494, lng: -121.9405 }, to: { lat: 37.3528, lng: -121.9361 } }
    const anonymous = await s.post('/api/google/route', body, { token: null })
    expect(anonymous.status).toBe(401)
    expect((await anonymous.json()).code).toBe('signed_out')
    expect((await s.post('/api/google/route', body, { token: 'not-a-live-session-token-at-all' })).status).toBe(401)
    expect(s.googleCalls).toHaveLength(0)
    expect((await s.post('/api/google/route', body)).status).toBe(200)
    expect(s.googleCalls).toHaveLength(1)
  })

  it('asks Supabase Auth once per token in 30 s, and caps new tokens per IP', async () => {
    let checks = 0
    const counting: SessionIdentity = { async verify(token) { checks++; return token === session ? { userId: user } : null } }
    const calendar = createGoogleCalendarService({ config: null, identity: counting, connections: memoryConnectionStore(), links: memoryPlanLinkStore(), busy: null })
    const api = createGoogleApi(calendar, createGoogleRoutesService(null), counting)
    const server = createServer((req, res) => { void api(req, res).then(done => { if (!done) { res.statusCode = 404; res.end() } }) })
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
    servers.push(server)
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
    const status = (token: string) => fetch_(base + '/api/google/status', { headers: { Authorization: `Bearer ${token}` } })
    for (let i = 0; i < 5; i++) expect((await status(session)).status).toBe(200)
    expect(checks).toBe(1)
    // A script spraying made-up tokens gets cut off before each one reaches Supabase Auth.
    const codes: number[] = []
    for (let i = 0; i < 130; i++) codes.push((await status(`made-up-token-number-${String(i).padStart(4, '0')}`)).status)
    expect(codes.filter(code => code === 429).length).toBeGreaterThan(0)
    expect(checks).toBeLessThanOrEqual(1 + 120)
  })
})
