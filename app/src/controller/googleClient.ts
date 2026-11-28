// CONTROLLER: same-origin calls to SideQuest's own Google endpoints. The
// browser never holds a Google token or key; it only learns whether Google
// is connected. The SideQuest session token comes from the sign-in module.
export type GoogleStatus = {
  calendar: { enabled: boolean; connected: boolean; exportEnabled: boolean }
  routes: { enabled: boolean }
  places: { enabled: boolean }
}
export type BusyBlock = { date: string; start: string; end: string }
export type GoogleWalkRoute = {
  source: 'google'
  label: string
  distanceMeters: number
  durationSeconds: number
  path: [number, number][]
}
export type SessionTokenProvider = () => Promise<string | null>
type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export class GoogleClientError extends Error {
  constructor(readonly status: number, message: string, readonly code: string) { super(message) }
}

/** Both initial consent and write-scope upgrades must lead to Google's OAuth endpoint. */
function consentAddress(value: unknown): string {
  try {
    if (typeof value !== 'string') throw Error('Invalid URL')
    const url = new URL(value)
    if (url.origin !== 'https://accounts.google.com' || url.pathname !== '/o/oauth2/v2/auth' ||
        url.username || url.password) throw Error('Invalid URL')
    return url.href
  } catch { throw new GoogleClientError(502, 'Unexpected reply.', 'error') }
}

export const GOOGLE_OFF: GoogleStatus = {
  calendar: { enabled: false, connected: false, exportEnabled: false },
  routes: { enabled: false },
  places: { enabled: false },
}

/** What the #google/... hash route after Google's consent screen means. */
export function googleReturnMessage(hash: string): string | null {
  switch (hash.replace(/^#/, '')) {
    case 'google/connected': return 'Google Calendar is connected.'
    case 'google/declined': return 'Google was not connected. Nothing was shared.'
    case 'google/failed': return 'That didn\'t work. Try connecting again.'
    case 'google/off': return 'Google Calendar is not turned on for SideQuest yet.'
    default: return null
  }
}

export function createGoogleClient(session: SessionTokenProvider, fetchImpl: Fetch = (i, init) => fetch(i, init)) {
  async function call<T>(path: string, init: RequestInit = {}, needsSession = true): Promise<T> {
    const token = await session()
    if (needsSession && !token) throw new GoogleClientError(401, 'Sign in to SideQuest first.', 'signed_out')
    const response = await fetchImpl(path, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'same-origin',
    })
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) {
      throw new GoogleClientError(response.status, String(data.error ?? 'Google is unavailable right now.'), String(data.code ?? 'error'))
    }
    return data as T
  }
  const post = <T>(path: string, body: unknown, needsSession = true) =>
    call<T>(path, { method: 'POST', body: JSON.stringify(body) }, needsSession)

  return {
    async status(requireSession = false): Promise<GoogleStatus> {
      // The public feature probe may fall back to OFF. A signed-in Calendar
      // panel must distinguish a failed or expired session from disconnected.
      if (requireSession) return call<GoogleStatus>('/api/google/status?session=required', { cache: 'no-store' })
      try { return await call<GoogleStatus>('/api/google/status', {}, false) }
      catch { return GOOGLE_OFF }
    },
    /** Returns Google's consent address. The caller sends the page there. */
    async connectUrl(withExport: boolean): Promise<string> {
      const { authorizeUrl } = await post<{ authorizeUrl: string }>('/api/google/calendar/connect', { export: withExport })
      return consentAddress(authorizeUrl)
    },
    async importBusy(from: string, to: string): Promise<BusyBlock[]> {
      return (await post<{ blocks: BusyBlock[] }>('/api/google/calendar/import', { from, to })).blocks
    },
    async setExport(enabled: boolean): Promise<{ exportEnabled: boolean; authorizeUrl?: string }> {
      const result = await post<{ exportEnabled: boolean; authorizeUrl?: string }>('/api/google/calendar/export', { enabled })
      return result.authorizeUrl === undefined ? result : { ...result, authorizeUrl: consentAddress(result.authorizeUrl) }
    },
    async syncPlan(change: { action: 'upsert'; planId: string; event: { title: string; date: string; start: string; end: string; location?: string } } | { action: 'remove'; planId: string }) {
      return post<{ synced: boolean; googleEventId: string | null }>('/api/google/calendar/plans', change)
    },
    async disconnect(): Promise<void> {
      await post('/api/google/calendar/disconnect', {})
    },
    /** A Google walking route for a near-campus place, drawn by our own map. */
    async walkingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<GoogleWalkRoute> {
      return post<GoogleWalkRoute>('/api/google/route', { from, to }, false)
    },
  }
}

export type GoogleClient = ReturnType<typeof createGoogleClient>
