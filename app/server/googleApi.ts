// SERVER COMPOSITION: wires Google Calendar and Google Routes to the real
// environment. Everything stays OFF until its flag and credentials exist.
// Google tokens live in server memory until the reviewed table in
// supabase/proposals is applied; a restart means reconnecting Google.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'
import {
  calendarConfigFromEnv, createGoogleCalendarApi, createGoogleCalendarService, memoryConnectionStore,
  memoryPlanLinkStore, type CalendarBusyStore, type GoogleCalendarService, type SessionIdentity,
} from './googleCalendar'
import { createGoogleRoutesApi, createGoogleRoutesService, routesConfigFromEnv, type GoogleRoutesService } from './googleRoutes'
import { bearer, pathOf, sendJson } from './googleShared'

type Env = Readonly<Record<string, unknown>>

function supabaseFromEnv(env: Env) {
  if (!createSupabaseEventCatalogFromEnv(env)) return null // existing safe-key validation
  const url = String(env.SUPABASE_URL).trim()
  const key = String(env.SUPABASE_PUBLISHABLE_KEY).trim()
  return (token?: string) => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    },
  })
}

export function supabaseIdentityFromEnv(env: Env): SessionIdentity | null {
  const client = supabaseFromEnv(env)
  if (!client) return null
  const auth = client()
  return {
    async verify(token) {
      try {
        const { data, error } = await auth.auth.getUser(token)
        return error || !data.user?.id ? null : { userId: data.user.id }
      } catch { return null }
    },
  }
}

/** busy_times through the person's own session, so RLS keeps it theirs. */
export function supabaseCalendarBusyFromEnv(env: Env): CalendarBusyStore | null {
  const client = supabaseFromEnv(env)
  if (!client) return null
  return {
    async replace(token, from, to, blocks) {
      const db = client(token)
      const removed = await db.from('busy_times').delete()
        .eq('source', 'calendar').gte('busy_date', from).lte('busy_date', to)
      if (removed.error) throw new Error('busy_times delete failed')
      if (!blocks.length) return
      const added = await db.from('busy_times').insert(blocks.map(b => ({
        busy_date: b.date, start_time: b.start, end_time: b.end, source: 'calendar',
      })))
      if (added.error) throw new Error('busy_times insert failed')
    },
    async removeAll(token) {
      const removed = await client(token).from('busy_times').delete().eq('source', 'calendar')
      if (removed.error) throw new Error('busy_times delete failed')
    },
  }
}

export function createGoogleApi(calendar: GoogleCalendarService, routes: GoogleRoutesService, identity: SessionIdentity | null) {
  const calendarApi = createGoogleCalendarApi(calendar, identity)
  const routesApi = createGoogleRoutesApi(routes)
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = pathOf(req)
    if (!url || !url.pathname.startsWith('/api/google/')) return false
    if (url.pathname === '/api/google/status') {
      if (req.method !== 'GET') { sendJson(res, 405, { error: 'Use GET.' }); return true }
      const token = bearer(req)
      const who = token && identity ? await identity.verify(token).catch(() => null) : null
      sendJson(res, 200, {
        calendar: await calendar.status(who?.userId ?? null),
        routes: { enabled: routes.enabled },
        places: { enabled: routes.placesEnabled },
      })
      return true
    }
    if (await calendarApi(req, res)) return true
    if (await routesApi(req, res)) return true
    sendJson(res, 404, { error: 'Not found.' })
    return true
  }
}

export function createGoogleApiFromEnv(env: Env) {
  const identity = supabaseIdentityFromEnv(env)
  const calendarConfig = identity ? calendarConfigFromEnv(env) : null // Calendar needs SideQuest accounts
  const calendar = createGoogleCalendarService({
    config: calendarConfig,
    identity,
    connections: memoryConnectionStore(),
    links: memoryPlanLinkStore(),
    busy: supabaseCalendarBusyFromEnv(env),
  })
  return {
    handle: createGoogleApi(calendar, createGoogleRoutesService(routesConfigFromEnv(env)), identity),
    /** For the plans controller: mirror a plan change into Google when export is on. */
    calendar,
  }
}

let shared: ReturnType<typeof createGoogleApiFromEnv> | null = null
/** The production server's single Google API, built from process.env on first use. */
export function googleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  shared ??= createGoogleApiFromEnv(process.env)
  return shared.handle(req, res)
}
export function googleCalendarForServer(): GoogleCalendarService {
  shared ??= createGoogleApiFromEnv(process.env)
  return shared.calendar
}
