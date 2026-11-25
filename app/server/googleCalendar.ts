// SERVER CONTROLLER: Google Calendar inside SideQuest.
// OFF unless SIDEQUEST_GOOGLE_CALENDAR_ENABLED=true and every credential is
// present. OAuth runs as a web-server flow with state and PKCE. Google tokens
// stay on this server, sealed with AES-256-GCM; the browser only ever sees
// "connected" or not. Import reads free/busy (start and end, never titles).
// Export writes a plan to Google only after the person turns it on.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  GoogleHttpError, NOT_ENABLED, bearer, createRateLimiter, pathOf, readJson,
  redirectHome, requireSameOrigin, sendError, sendJson, withDeadline, type FetchLike,
} from './googleShared'
import { CAMPUS_TIME_ZONE, addDays, busyToBlocks, campusMidnight, isIsoDate, type BusyBlock } from './googleTime'

export const SCOPE_FREEBUSY = 'https://www.googleapis.com/auth/calendar.freebusy'
export const SCOPE_EVENTS = 'https://www.googleapis.com/auth/calendar.events'
const AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN = 'https://oauth2.googleapis.com/token'
const REVOKE = 'https://oauth2.googleapis.com/revoke'
const CALENDAR = 'https://www.googleapis.com/calendar/v3'
const PENDING_MS = 10 * 60_000
const MAX_IMPORT_DAYS = 14
const PLAN_ID = /^[A-Za-z0-9_-]{1,80}$/
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export type CalendarConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  sealKey: Buffer // 32 bytes
}

export type GoogleConnection = {
  userId: string
  sealedAccess: string
  sealedRefresh: string | null
  accessExpiresAt: number
  scopes: string[]
  exportEnabled: boolean
  connectedAt: number
}
export interface GoogleConnectionStore {
  get(userId: string): Promise<GoogleConnection | null>
  put(connection: GoogleConnection): Promise<void>
  delete(userId: string): Promise<void>
}
export interface PlanLinkStore {
  get(userId: string, planId: string): Promise<string | null>
  put(userId: string, planId: string, googleEventId: string): Promise<void>
  delete(userId: string, planId: string): Promise<void>
  deleteAll(userId: string): Promise<void>
}
/** busy_times rows with source 'calendar', written with the person's own session. */
export interface CalendarBusyStore {
  replace(sessionToken: string, from: string, to: string, blocks: BusyBlock[]): Promise<void>
  removeAll(sessionToken: string): Promise<void>
}
export interface SessionIdentity {
  verify(sessionToken: string): Promise<{ userId: string } | null>
}

export type PlanEvent = { title: string; date: string; start: string; end: string; location?: string }
export type PlanChange =
  | { action: 'upsert'; planId: string; event: PlanEvent }
  | { action: 'remove'; planId: string }

export function memoryConnectionStore(): GoogleConnectionStore & { rows: Map<string, GoogleConnection> } {
  const rows = new Map<string, GoogleConnection>()
  return {
    rows,
    async get(userId) { return rows.get(userId) ?? null },
    async put(connection) { rows.set(connection.userId, { ...connection }) },
    async delete(userId) { rows.delete(userId) },
  }
}
export function memoryPlanLinkStore(): PlanLinkStore & { rows: Map<string, string> } {
  const rows = new Map<string, string>()
  const key = (u: string, p: string) => u + '\0' + p
  return {
    rows,
    async get(u, p) { return rows.get(key(u, p)) ?? null },
    async put(u, p, id) { rows.set(key(u, p), id) },
    async delete(u, p) { rows.delete(key(u, p)) },
    async deleteAll(u) { for (const k of [...rows.keys()]) if (k.startsWith(u + '\0')) rows.delete(k) },
  }
}

const b64url = (buf: Buffer) => buf.toString('base64url')

export function seal(key: Buffer, plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [b64url(iv), b64url(cipher.getAuthTag()), b64url(body)].join('.')
}
export function unseal(key: Buffer, sealed: string): string {
  const [iv, tag, body] = sealed.split('.').map(part => Buffer.from(part, 'base64url'))
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}

export function calendarConfigFromEnv(env: Readonly<Record<string, unknown>>): CalendarConfig | null {
  if (env.SIDEQUEST_GOOGLE_CALENDAR_ENABLED !== 'true') return null
  const clientId = String(env.GOOGLE_OAUTH_CLIENT_ID ?? '').trim()
  const clientSecret = String(env.GOOGLE_OAUTH_CLIENT_SECRET ?? '').trim()
  const redirectUri = String(env.GOOGLE_OAUTH_REDIRECT_URI ?? '').trim()
  const sealKey = Buffer.from(String(env.SIDEQUEST_TOKEN_KEY ?? ''), 'base64')
  let redirectOk = false
  try {
    const url = new URL(redirectUri)
    redirectOk = url.pathname === '/api/google/calendar/callback' &&
      (url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch { redirectOk = false }
  if (!clientId || !clientSecret || !redirectOk || sealKey.length !== 32) return null
  return { clientId, clientSecret, redirectUri, sealKey }
}

type Pending = { userId: string; verifier: string; scopes: string[]; exportEnabled: boolean; until: number }

export type CalendarDeps = {
  config: CalendarConfig | null
  identity: SessionIdentity | null
  connections: GoogleConnectionStore
  links: PlanLinkStore
  busy: CalendarBusyStore | null
  fetch?: FetchLike
  clock?: () => number
}

export function createGoogleCalendarService(deps: CalendarDeps) {
  const clock = deps.clock ?? Date.now
  const http = withDeadline(deps.fetch ?? ((input, init) => fetch(input, init)))
  const pending = new Map<string, Pending>()
  const config = deps.config

  function need(): CalendarConfig {
    if (!config) throw new GoogleHttpError(503, 'Google Calendar is not enabled.', NOT_ENABLED)
    return config
  }

  async function tokenRequest(form: Record<string, string>): Promise<Record<string, unknown>> {
    const response = await http(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    })
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) {
      if (data.error === 'invalid_grant') throw new GoogleHttpError(409, 'Reconnect Google to keep going.', 'reconnect')
      throw new GoogleHttpError(502, 'Google did not answer. Try again.')
    }
    return data
  }

  /** A fresh Google access token for this person, refreshed if it is about to expire. */
  async function accessToken(userId: string): Promise<{ token: string; connection: GoogleConnection }> {
    const cfg = need()
    const connection = await deps.connections.get(userId)
    if (!connection) throw new GoogleHttpError(409, 'Connect Google first.', 'not_connected')
    if (connection.accessExpiresAt > clock() + 60_000) {
      return { token: unseal(cfg.sealKey, connection.sealedAccess), connection }
    }
    if (!connection.sealedRefresh) {
      await deps.connections.delete(userId)
      throw new GoogleHttpError(409, 'Reconnect Google to keep going.', 'reconnect')
    }
    let data: Record<string, unknown>
    try {
      data = await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: unseal(cfg.sealKey, connection.sealedRefresh),
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      })
    } catch (error) {
      if (error instanceof GoogleHttpError && error.code === 'reconnect') await deps.connections.delete(userId)
      throw error
    }
    const token = String(data.access_token ?? '')
    if (!token) throw new GoogleHttpError(502, 'Google did not answer. Try again.')
    const next = {
      ...connection,
      sealedAccess: seal(cfg.sealKey, token),
      accessExpiresAt: clock() + Number(data.expires_in ?? 3600) * 1000,
    }
    await deps.connections.put(next)
    return { token, connection: next }
  }

  async function google(token: string, method: string, path: string, body?: unknown): Promise<Response> {
    return http(CALENDAR + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  }

  return {
    enabled: config !== null,

    async status(userId: string | null) {
      if (!config) return { enabled: false, connected: false, exportEnabled: false }
      const connection = userId ? await deps.connections.get(userId) : null
      return {
        enabled: true,
        connected: connection !== null,
        exportEnabled: Boolean(connection?.exportEnabled && connection.scopes.includes(SCOPE_EVENTS)),
      }
    },

    /** Starts consent. Returns Google's consent address; the person comes back to /#google/... */
    begin(userId: string, wantExport: boolean): string {
      const cfg = need()
      const now = clock()
      for (const [key, row] of pending) if (row.until <= now) pending.delete(key)
      if (pending.size > 5000) throw new GoogleHttpError(429, 'Too many requests. Try again in a minute.')
      const state = b64url(randomBytes(32))
      const verifier = b64url(randomBytes(48))
      const challenge = b64url(createHash('sha256').update(verifier).digest())
      const scopes = wantExport ? [SCOPE_FREEBUSY, SCOPE_EVENTS] : [SCOPE_FREEBUSY]
      pending.set(state, { userId, verifier, scopes, exportEnabled: wantExport, until: now + PENDING_MS })
      const url = new URL(AUTHORIZE)
      url.search = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent',
      }).toString()
      return url.toString()
    },

    /** Handles Google's redirect. Returns the SideQuest hash route to land on. */
    async finish(query: URLSearchParams): Promise<string> {
      const cfg = need()
      const state = query.get('state') ?? ''
      const row = pending.get(state)
      if (row) pending.delete(state) // single use, whatever happens next
      if (!row || row.until <= clock()) return 'google/failed'
      if (query.get('error')) return 'google/declined'
      const code = query.get('code')
      if (!code || code.length > 2048) return 'google/failed'
      let data: Record<string, unknown>
      try {
        data = await tokenRequest({
          grant_type: 'authorization_code',
          code,
          code_verifier: row.verifier,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          redirect_uri: cfg.redirectUri,
        })
      } catch { return 'google/failed' }
      const granted = String(data.scope ?? '').split(/\s+/).filter(Boolean)
      const access = String(data.access_token ?? '')
      if (!access || !granted.includes(SCOPE_FREEBUSY)) return 'google/declined'
      const before = await deps.connections.get(row.userId)
      const refresh = typeof data.refresh_token === 'string' ? data.refresh_token : null
      await deps.connections.put({
        userId: row.userId,
        sealedAccess: seal(cfg.sealKey, access),
        sealedRefresh: refresh ? seal(cfg.sealKey, refresh) : before?.sealedRefresh ?? null,
        accessExpiresAt: clock() + Number(data.expires_in ?? 3600) * 1000,
        scopes: granted,
        exportEnabled: row.exportEnabled && granted.includes(SCOPE_EVENTS),
        connectedAt: before?.connectedAt ?? clock(),
      })
      return 'google/connected'
    },

    /** Reads free/busy for [from, to] and stores it as busy_times source 'calendar'. */
    async importBusy(userId: string, sessionToken: string, from: string, to: string): Promise<BusyBlock[]> {
      need()
      if (!isIsoDate(from) || !isIsoDate(to) || to < from || to > addDays(from, MAX_IMPORT_DAYS - 1)) {
        throw new GoogleHttpError(400, 'Pick up to two weeks to bring in.')
      }
      if (!deps.busy) throw new GoogleHttpError(503, 'Saved busy time is not enabled.', NOT_ENABLED)
      const { token } = await accessToken(userId)
      const response = await google(token, 'POST', '/freeBusy', {
        timeMin: new Date(campusMidnight(from)).toISOString(),
        timeMax: new Date(campusMidnight(addDays(to, 1))).toISOString(),
        timeZone: CAMPUS_TIME_ZONE,
        items: [{ id: 'primary' }],
      })
      if (response.status === 401) throw new GoogleHttpError(409, 'Reconnect Google to keep going.', 'reconnect')
      if (!response.ok) throw new GoogleHttpError(502, 'Google did not answer. Try again.')
      const data = await response.json() as { calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> }
      const primary = data.calendars?.primary
      if (!primary || primary.errors?.length) throw new GoogleHttpError(502, 'Google could not read that calendar.')
      const blocks = busyToBlocks((primary.busy ?? []).slice(0, 500), from, to)
      await deps.busy.replace(sessionToken, from, to, blocks)
      return blocks
    },

    async setExport(userId: string, enabled: boolean): Promise<{ exportEnabled: boolean; needsConsent: boolean }> {
      need()
      const connection = await deps.connections.get(userId)
      if (!connection) throw new GoogleHttpError(409, 'Connect Google first.', 'not_connected')
      if (enabled && !connection.scopes.includes(SCOPE_EVENTS)) return { exportEnabled: false, needsConsent: true }
      await deps.connections.put({ ...connection, exportEnabled: enabled })
      return { exportEnabled: enabled, needsConsent: false }
    },

    /** Mirrors one plan change into the person's Google Calendar, if export is on. */
    async syncPlan(userId: string, change: PlanChange): Promise<{ synced: boolean; googleEventId: string | null }> {
      need()
      const connection = await deps.connections.get(userId)
      if (!connection?.exportEnabled || !connection.scopes.includes(SCOPE_EVENTS)) {
        return { synced: false, googleEventId: null }
      }
      const { token } = await accessToken(userId)
      const existing = await deps.links.get(userId, change.planId)
      if (change.action === 'remove') {
        if (existing) {
          const response = await google(token, 'DELETE', `/calendars/primary/events/${encodeURIComponent(existing)}`)
          if (!response.ok && response.status !== 404 && response.status !== 410) {
            throw new GoogleHttpError(502, 'Google did not answer. Try again.')
          }
          await deps.links.delete(userId, change.planId)
        }
        return { synced: true, googleEventId: null }
      }
      const e = change.event
      const body = {
        summary: e.title,
        ...(e.location ? { location: e.location } : {}),
        description: 'Planned in SideQuest.',
        start: { dateTime: `${e.date}T${e.start}:00`, timeZone: CAMPUS_TIME_ZONE },
        end: { dateTime: `${e.date}T${e.end}:00`, timeZone: CAMPUS_TIME_ZONE },
        extendedProperties: { private: { sidequestPlanId: change.planId } },
      }
      let response = existing
        ? await google(token, 'PATCH', `/calendars/primary/events/${encodeURIComponent(existing)}`, body)
        : await google(token, 'POST', '/calendars/primary/events', body)
      if (existing && (response.status === 404 || response.status === 410)) {
        response = await google(token, 'POST', '/calendars/primary/events', body) // deleted in Google: add it again
      }
      if (!response.ok) throw new GoogleHttpError(502, 'Google did not answer. Try again.')
      const id = String((await response.json() as { id?: unknown }).id ?? '')
      if (!id) throw new GoogleHttpError(502, 'Google did not answer. Try again.')
      await deps.links.put(userId, change.planId, id)
      return { synced: true, googleEventId: id }
    },

    /** Revokes Google's access, then deletes tokens, plan links and imported busy time. */
    async disconnect(userId: string, sessionToken: string): Promise<void> {
      const cfg = need()
      const connection = await deps.connections.get(userId)
      if (connection) {
        const token = connection.sealedRefresh ?? connection.sealedAccess
        try {
          await http(REVOKE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: unseal(cfg.sealKey, token) }).toString(),
          })
        } catch { /* Delete our copy even if Google is unreachable. */ }
      }
      await deps.connections.delete(userId)
      await deps.links.deleteAll(userId)
      if (deps.busy) await deps.busy.removeAll(sessionToken)
    },
  }
}

export type GoogleCalendarService = ReturnType<typeof createGoogleCalendarService>

function planChangeFrom(data: Record<string, unknown>): PlanChange {
  const planId = data.planId
  if (typeof planId !== 'string' || !PLAN_ID.test(planId)) throw new GoogleHttpError(400, 'Invalid plan.')
  if (data.action === 'remove') return { action: 'remove', planId }
  const e = data.event as Record<string, unknown> | undefined
  if (data.action !== 'upsert' || !e || typeof e !== 'object') throw new GoogleHttpError(400, 'Invalid plan.')
  const title = typeof e.title === 'string' ? e.title.trim() : ''
  const location = typeof e.location === 'string' ? e.location.trim() : ''
  if (!title || title.length > 120 || location.length > 200 || !isIsoDate(e.date) ||
    typeof e.start !== 'string' || typeof e.end !== 'string' ||
    !HHMM.test(e.start) || !HHMM.test(e.end) || e.start >= e.end) {
    throw new GoogleHttpError(400, 'Invalid plan.')
  }
  return { action: 'upsert', planId, event: { title, date: e.date, start: e.start, end: e.end, ...(location ? { location } : {}) } }
}

/** HTTP routes under /api/google/calendar and /api/google/status. */
export function createGoogleCalendarApi(
  service: GoogleCalendarService,
  identity: SessionIdentity | null,
  clock: () => number = Date.now,
) {
  const limit = createRateLimiter(30, 60_000, clock)
  async function who(req: IncomingMessage): Promise<{ userId: string; session: string }> {
    const session = bearer(req)
    const found = session && identity ? await identity.verify(session).catch(() => null) : null
    if (!session || !found) throw new GoogleHttpError(401, 'Sign in to SideQuest first.', 'signed_out')
    return { userId: found.userId, session }
  }

  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = pathOf(req)
    if (!url || !url.pathname.startsWith('/api/google/calendar/')) return false
    const path = url.pathname

    if (path === '/api/google/calendar/callback') {
      // A top-level return from Google: no SideQuest session on this request,
      // so the one-time state carries who started it.
      if (req.method !== 'GET') { sendJson(res, 405, { error: 'Use GET.' }); return true }
      if (!service.enabled) { redirectHome(res, 'google/off'); return true }
      redirectHome(res, await service.finish(url.searchParams))
      return true
    }

    try {
      if (!service.enabled) throw new GoogleHttpError(503, 'Google Calendar is not enabled.', NOT_ENABLED)
      if (req.method !== 'POST') throw new GoogleHttpError(405, 'Use POST.')
      requireSameOrigin(req)
      const me = await who(req)
      limit(me.userId)
      const data = await readJson(req)
      if (path === '/api/google/calendar/connect') {
        sendJson(res, 200, { authorizeUrl: service.begin(me.userId, data.export === true) })
      } else if (path === '/api/google/calendar/import') {
        const blocks = await service.importBusy(me.userId, me.session, String(data.from), String(data.to))
        sendJson(res, 200, { blocks })
      } else if (path === '/api/google/calendar/export') {
        if (typeof data.enabled !== 'boolean') throw new GoogleHttpError(400, 'Invalid request.')
        const result = await service.setExport(me.userId, data.enabled)
        sendJson(res, 200, result.needsConsent
          ? { ...result, authorizeUrl: service.begin(me.userId, true) }
          : result)
      } else if (path === '/api/google/calendar/plans') {
        sendJson(res, 200, await service.syncPlan(me.userId, planChangeFrom(data)))
      } else if (path === '/api/google/calendar/disconnect') {
        await service.disconnect(me.userId, me.session)
        sendJson(res, 200, { connected: false })
      } else {
        throw new GoogleHttpError(404, 'Not found.')
      }
    } catch (error) {
      sendError(res, error, 'Google Calendar is unavailable right now.')
    }
    return true
  }
}
