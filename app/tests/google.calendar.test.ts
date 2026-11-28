import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  SCOPE_EVENTS, SCOPE_FREEBUSY, calendarConfigFromEnv, createGoogleCalendarService, memoryConnectionStore,
  memoryPlanLinkStore, type CalendarBusyStore,
} from '../server/googleCalendar'
import { busyToBlocks, campusMidnight } from '../server/googleTime'

const user = '11111111-1111-4111-8111-111111111111'
const session = 'sidequest-session-token-for-tests-only'
const config = {
  clientId: 'client-id.apps.googleusercontent.com',
  clientSecret: 'test-client-secret-value',
  redirectUri: 'https://sidequest.example/api/google/calendar/callback',
  sealKey: randomBytes(32),
}
const ACCESS = 'ya29.test-google-access-token'
const REFRESH = '1//test-google-refresh-token'

type Call = { url: string; init?: RequestInit }
function fakeGoogle(routes: Record<string, (call: Call) => Response>) {
  const calls: Call[] = []
  const fetch = async (url: string, init?: RequestInit) => {
    const call = { url, init }
    calls.push(call)
    const key = Object.keys(routes).find(prefix => (init?.method ?? 'GET') + ' ' + url === prefix || url.startsWith(prefix) || ((init?.method ?? 'GET') + ' ' + url).startsWith(prefix))
    if (!key) throw new Error('unexpected Google call ' + url)
    return routes[key](call)
  }
  return { fetch, calls }
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const tokenReply = (scope = SCOPE_FREEBUSY) => json({ access_token: ACCESS, refresh_token: REFRESH, expires_in: 3600, scope, token_type: 'Bearer' })

function memoryBusy(): CalendarBusyStore & { rows: Map<string, unknown> } {
  const rows = new Map<string, unknown>()
  return {
    rows,
    async replace(token, from, to, blocks) { rows.set(token, { from, to, blocks }) },
    async removeAll(token) { rows.delete(token) },
  }
}

function setup(routes: Record<string, (call: Call) => Response> = {}) {
  const google = fakeGoogle({ 'https://oauth2.googleapis.com/token': () => tokenReply(SCOPE_FREEBUSY + ' ' + SCOPE_EVENTS), ...routes })
  const connections = memoryConnectionStore(), links = memoryPlanLinkStore(), busy = memoryBusy()
  let now = Date.parse('2026-11-24T20:00:00Z')
  const service = createGoogleCalendarService({
    config, identity: null, connections, links, busy, fetch: google.fetch, clock: () => now,
  })
  return { service, google, connections, links, busy, tick: (ms: number) => { now += ms } }
}
async function connect(s: ReturnType<typeof setup>, withExport = true) {
  const url = new URL(s.service.begin(user, withExport))
  return s.service.finish(new URLSearchParams({ state: url.searchParams.get('state')!, code: 'auth-code-from-google' }))
}

describe('Google Calendar connection (OAuth web flow with state and PKCE)', () => {
  it('stays off unless the flag and every credential are present', () => {
    const env = {
      SIDEQUEST_GOOGLE_CALENDAR_ENABLED: 'true', GOOGLE_OAUTH_CLIENT_ID: 'id', GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'https://sq.example/api/google/calendar/callback', SIDEQUEST_TOKEN_KEY: randomBytes(32).toString('base64'),
    }
    expect(calendarConfigFromEnv(env)).not.toBeNull()
    expect(calendarConfigFromEnv({ ...env, SIDEQUEST_GOOGLE_CALENDAR_ENABLED: 'false' })).toBeNull()
    expect(calendarConfigFromEnv({ ...env, SIDEQUEST_TOKEN_KEY: 'short' })).toBeNull()
    expect(calendarConfigFromEnv({ ...env, GOOGLE_OAUTH_REDIRECT_URI: 'http://evil.example/api/google/calendar/callback' })).toBeNull()
  })

  it('asks only for free/busy unless plans should go to Google, with PKCE S256', () => {
    const { service } = setup()
    const plain = new URL(service.begin(user, false))
    expect(plain.origin + plain.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(plain.searchParams.get('scope')).toBe(SCOPE_FREEBUSY)
    expect(plain.searchParams.get('code_challenge_method')).toBe('S256')
    expect(plain.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(plain.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(new URL(service.begin(user, true)).searchParams.get('scope')).toBe(`${SCOPE_FREEBUSY} ${SCOPE_EVENTS}`)
  })

  it('rejects a state it did not issue and never exchanges the code', async () => {
    const s = setup()
    s.service.begin(user, false)
    expect(await s.service.finish(new URLSearchParams({ state: 'forged-state', code: 'stolen-code' }))).toBe('google/failed')
    expect(s.google.calls).toHaveLength(0)
    expect(s.connections.rows.size).toBe(0)
  })

  it('uses each state once and lets it expire after ten minutes', async () => {
    const s = setup()
    const state = new URL(s.service.begin(user, false)).searchParams.get('state')!
    expect(await s.service.finish(new URLSearchParams({ state, code: 'c' }))).toBe('google/connected')
    expect(await s.service.finish(new URLSearchParams({ state, code: 'c' }))).toBe('google/failed')
    const late = new URL(s.service.begin(user, false)).searchParams.get('state')!
    s.tick(11 * 60_000)
    expect(await s.service.finish(new URLSearchParams({ state: late, code: 'c' }))).toBe('google/failed')
  })

  it('sends the PKCE verifier and keeps tokens sealed, never in plain text', async () => {
    const s = setup()
    expect(await connect(s)).toBe('google/connected')
    const form = new URLSearchParams(String(s.google.calls[0].init?.body))
    expect(form.get('grant_type')).toBe('authorization_code')
    expect(form.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{64}$/)
    const stored = JSON.stringify([...s.connections.rows.values()])
    expect(stored).not.toContain(ACCESS)
    expect(stored).not.toContain(REFRESH)
    expect(await s.service.status(user)).toEqual({ enabled: true, connected: true, exportEnabled: true })
  })

  it('treats a declined consent as declined, with nothing stored', async () => {
    const s = setup()
    const state = new URL(s.service.begin(user, false)).searchParams.get('state')!
    expect(await s.service.finish(new URLSearchParams({ state, error: 'access_denied' }))).toBe('google/declined')
    expect(s.connections.rows.size).toBe(0)
  })
})

describe('free/busy import', () => {
  it('turns Google busy instants into Santa Clara same-day blocks, split at midnight', () => {
    expect(busyToBlocks([
      { start: '2026-11-24T17:00:00Z', end: '2026-11-24T18:30:00Z' }, // 9:00-10:30 PST
      { start: '2026-11-25T06:00:00Z', end: '2026-11-25T09:00:00Z' }, // 22:00 Tue - 01:00 Wed
      { start: '2026-11-20T10:00:00Z', end: '2026-11-20T11:00:00Z' }, // before the range
    ], '2026-11-24', '2026-11-30')).toEqual([
      { date: '2026-11-24', start: '09:00', end: '10:30' },
      { date: '2026-11-24', start: '22:00', end: '23:59' },
      { date: '2026-11-25', start: '00:00', end: '01:00' },
    ])
  })

  it('handles the daylight-saving change in March', () => {
    expect(new Date(campusMidnight('2027-03-14')).toISOString()).toBe('2027-03-14T08:00:00.000Z')
    expect(new Date(campusMidnight('2027-03-15')).toISOString()).toBe('2027-03-15T07:00:00.000Z')
  })

  it('reads the primary calendar for the shown week and stores busy blocks only', async () => {
    const s = setup({
      'POST https://www.googleapis.com/calendar/v3/freeBusy': () => json({
        calendars: { primary: { busy: [{ start: '2026-11-25T18:00:00Z', end: '2026-11-25T19:15:00Z' }] } },
      }),
    })
    await connect(s, false)
    const blocks = await s.service.importBusy(user, session, '2026-11-24', '2026-11-30')
    expect(blocks).toEqual([{ date: '2026-11-25', start: '10:00', end: '11:15' }])
    const call = s.google.calls.find(c => c.url.endsWith('/freeBusy'))!
    expect(new Headers(call.init?.headers).get('authorization')).toBe(`Bearer ${ACCESS}`)
    expect(JSON.parse(String(call.init?.body))).toEqual({
      timeMin: '2026-11-24T08:00:00.000Z', timeMax: '2026-12-01T08:00:00.000Z',
      timeZone: 'America/Los_Angeles', items: [{ id: 'primary' }],
    })
    expect(s.busy.rows.get(session)).toEqual({ from: '2026-11-24', to: '2026-11-30', blocks })
  })

  it('refuses more than two weeks and asks to connect first', async () => {
    const s = setup()
    await expect(s.service.importBusy(user, session, '2026-11-24', '2026-12-08')).rejects.toMatchObject({ status: 400 })
    await expect(s.service.importBusy(user, session, '2026-11-24', '2026-11-30')).rejects.toMatchObject({ code: 'not_connected' })
  })

  it('refreshes an expired access token with the refresh token', async () => {
    const s = setup({
      'POST https://www.googleapis.com/calendar/v3/freeBusy': () => json({ calendars: { primary: { busy: [] } } }),
    })
    await connect(s, false)
    s.tick(2 * 3600_000)
    await s.service.importBusy(user, session, '2026-11-24', '2026-11-24')
    const forms = s.google.calls.filter(c => c.url === 'https://oauth2.googleapis.com/token')
      .map(c => new URLSearchParams(String(c.init?.body)).get('grant_type'))
    expect(forms).toEqual(['authorization_code', 'refresh_token'])
  })
})

describe('plans to Google', () => {
  const plan = { title: 'Boba run', date: '2026-11-26', start: '19:00', end: '20:00', location: 'Benson' }

  it('does nothing until the person turns export on', async () => {
    const s = setup()
    await connect(s, false)
    expect(await s.service.syncPlan(user, { action: 'upsert', planId: 'p1', event: plan })).toEqual({ synced: false, googleEventId: null })
    expect(s.google.calls.filter(c => c.url.includes('/events'))).toHaveLength(0)
  })

  it('adds, updates the same event, then deletes it when the plan is dropped', async () => {
    const s = setup({
      'POST https://www.googleapis.com/calendar/v3/calendars/primary/events': () => json({ id: 'gEvent1' }),
      'PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/gEvent1': () => json({ id: 'gEvent1' }),
      'DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/gEvent1': () => new Response(null, { status: 204 }),
    })
    await connect(s, true)
    expect(await s.service.syncPlan(user, { action: 'upsert', planId: 'p1', event: plan })).toEqual({ synced: true, googleEventId: 'gEvent1' })
    const added = JSON.parse(String(s.google.calls.at(-1)!.init?.body))
    expect(added).toMatchObject({
      summary: 'Boba run', location: 'Benson',
      start: { dateTime: '2026-11-26T19:00:00', timeZone: 'America/Los_Angeles' },
      end: { dateTime: '2026-11-26T20:00:00', timeZone: 'America/Los_Angeles' },
      extendedProperties: { private: { sidequestPlanId: 'p1' } },
    })
    await s.service.syncPlan(user, { action: 'upsert', planId: 'p1', event: { ...plan, end: '21:00' } })
    expect(s.google.calls.at(-1)!.init?.method).toBe('PATCH')
    await s.service.syncPlan(user, { action: 'remove', planId: 'p1' })
    expect(s.google.calls.at(-1)!.init?.method).toBe('DELETE')
    expect(s.links.rows.size).toBe(0)
  })

  it('adds the plan again if it was deleted inside Google', async () => {
    let posts = 0
    const s = setup({
      'POST https://www.googleapis.com/calendar/v3/calendars/primary/events': () => json({ id: `g${++posts}` }),
      'PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/g1': () => new Response(null, { status: 410 }),
    })
    await connect(s, true)
    await s.service.syncPlan(user, { action: 'upsert', planId: 'p1', event: plan })
    expect((await s.service.syncPlan(user, { action: 'upsert', planId: 'p1', event: plan })).googleEventId).toBe('g2')
  })
})

describe('disconnect', () => {
  it('revokes at Google, then deletes tokens, plan links and imported busy time', async () => {
    const s = setup({
      'POST https://oauth2.googleapis.com/revoke': () => new Response(null, { status: 200 }),
      'POST https://www.googleapis.com/calendar/v3/calendars/primary/events': () => json({ id: 'gEvent1' }),
    })
    await connect(s, true)
    await s.service.syncPlan(user, { action: 'upsert', planId: 'p1', event: { title: 'Run', date: '2026-11-26', start: '07:00', end: '08:00' } })
    await s.busy.replace(session, '2026-11-24', '2026-11-30', [])
    await s.service.disconnect(user, session)
    const revoke = s.google.calls.find(c => c.url === 'https://oauth2.googleapis.com/revoke')!
    expect(new URLSearchParams(String(revoke.init?.body)).get('token')).toBe(REFRESH)
    expect(s.connections.rows.size).toBe(0)
    expect(s.links.rows.size).toBe(0)
    expect(s.busy.rows.size).toBe(0)
    expect(await s.service.status(user)).toEqual({ enabled: true, connected: false, exportEnabled: false })
  })

  it('still deletes our copy when Google cannot be reached', async () => {
    const s = setup({ 'POST https://oauth2.googleapis.com/revoke': () => { throw new Error('offline') } })
    await connect(s, false)
    await s.service.disconnect(user, session)
    expect(s.connections.rows.size).toBe(0)
  })
})
