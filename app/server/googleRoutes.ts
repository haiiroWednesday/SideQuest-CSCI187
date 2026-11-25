// SERVER CONTROLLER: Google walking routes and place details, drawn by our
// own campus map. OFF unless SIDEQUEST_GOOGLE_ROUTES_ENABLED=true with a
// server-only GOOGLE_MAPS_SERVER_KEY. Places details have their own flag.
// Only near-campus trips are sent to Google; on campus we route on our own
// path graph. Every Google route is labelled as not checked on foot.
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  GoogleHttpError, NOT_ENABLED, createRateLimiter, pathOf, readJson,
  requireSameOrigin, sendError, sendJson, withDeadline, type FetchLike,
} from './googleShared'
import { clientIp } from './clientIp'

export const GOOGLE_ROUTE_LABEL = 'Google route, not checked on foot'
export const CAMPUS_CENTER = { lat: 37.3496, lng: -121.939 }
export const NEAR_CAMPUS_KM = 2.5
const ROUTES = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const PLACES = 'https://places.googleapis.com/v1/'
const CACHE_MS = 10 * 60_000
const CACHE_MAX = 500
const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/
/** Calls to Google (routes, place details, photos) allowed per UTC day, for the whole server. Cache hits are free. */
export const GOOGLE_DAILY_REQUEST_BUDGET = 1000
/** A device position is snapped to a grid of about this many metres before it is cached or sent to Google. */
export const ORIGIN_ROUNDING_METERS = 25
const METERS_PER_DEGREE = 111_320

export type LatLng = { lat: number; lng: number }
export type GoogleWalkRoute = {
  source: 'google'
  label: string
  distanceMeters: number
  durationSeconds: number
  path: [number, number][]
}
export type GooglePlaceDetails = {
  name: string
  hours: string[]
  photo: { url: string; attributions: { name: string; uri: string | null }[] } | null
  credit: 'Google'
}

export type RoutesConfig = { apiKey: string; placesEnabled: boolean }

export function routesConfigFromEnv(env: Readonly<Record<string, unknown>>): RoutesConfig | null {
  if (env.SIDEQUEST_GOOGLE_ROUTES_ENABLED !== 'true') return null
  const apiKey = String(env.GOOGLE_MAPS_SERVER_KEY ?? '').trim()
  if (apiKey.length < 20) return null
  return { apiKey, placesEnabled: env.SIDEQUEST_GOOGLE_PLACES_ENABLED === 'true' }
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const r = 6371
  const rad = (d: number) => d * Math.PI / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(h))
}

/** Google's encoded polyline format (precision 5) to [lat, lng] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0, shift = 0, byte: number
      do {
        if (index >= encoded.length) return points
        byte = encoded.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lng += delta
    }
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

/** Snaps a position to a ~25 m grid, so Google and the cache never get someone's exact spot. */
export function roundOrigin(p: LatLng, meters = ORIGIN_ROUNDING_METERS): LatLng {
  const latStep = meters / METERS_PER_DEGREE
  const lat = Math.round(p.lat / latStep) * latStep
  const lngStep = meters / (METERS_PER_DEGREE * Math.max(Math.cos(lat * Math.PI / 180), 0.01))
  const lng = Math.round(p.lng / lngStep) * lngStep
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
}

function point(value: unknown): LatLng | null {
  const v = value as Record<string, unknown> | null
  if (!v || typeof v !== 'object') return null
  const lat = Number(v.lat), lng = Number(v.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  // About 1 m. Finer detail of someone's position is never sent or cached.
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }
}

export function createGoogleRoutesService(config: RoutesConfig | null, options: { fetch?: FetchLike; clock?: () => number } = {}) {
  const clock = options.clock ?? Date.now
  const deadline = withDeadline(options.fetch ?? ((input, init) => fetch(input, init)))
  const cache = new Map<string, { until: number; value: unknown }>()
  const budget = { day: '', used: 0 }
  // Every outbound Google call spends from one daily budget, so a script cannot run up the bill.
  const http: FetchLike = (input, init) => {
    const day = new Date(clock()).toISOString().slice(0, 10)
    if (budget.day !== day) { budget.day = day; budget.used = 0 }
    if (budget.used >= GOOGLE_DAILY_REQUEST_BUDGET) {
      return Promise.reject(new GoogleHttpError(503, 'Google maps are resting for today. Try again tomorrow.', 'daily_budget'))
    }
    budget.used++
    return deadline(input, init)
  }

  function remember<T>(key: string, value: T): T {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
    cache.set(key, { until: clock() + CACHE_MS, value })
    return value
  }
  function recall<T>(key: string): T | null {
    const hit = cache.get(key)
    if (!hit) return null
    if (hit.until <= clock()) { cache.delete(key); return null }
    return hit.value as T
  }

  return {
    enabled: config !== null,
    placesEnabled: Boolean(config?.placesEnabled),

    async walk(device: LatLng, to: LatLng): Promise<GoogleWalkRoute> {
      if (!config) throw new GoogleHttpError(503, 'Google walking routes are not enabled.', NOT_ENABLED)
      const from = roundOrigin(device)
      if (distanceKm(CAMPUS_CENTER, to) > NEAR_CAMPUS_KM || distanceKm(CAMPUS_CENTER, from) > NEAR_CAMPUS_KM) {
        throw new GoogleHttpError(422, 'Google routes are only for places near campus.', 'too_far')
      }
      const key = `walk:${from.lat},${from.lng}>${to.lat},${to.lng}`
      const hit = recall<GoogleWalkRoute>(key)
      if (hit) return hit
      const response = await http(ROUTES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
          destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
          travelMode: 'WALK',
          polylineQuality: 'HIGH_QUALITY',
          languageCode: 'en-US',
          units: 'METRIC',
        }),
      })
      if (!response.ok) throw new GoogleHttpError(502, 'Google could not find a walking route.')
      const data = await response.json() as { routes?: { duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string } }[] }
      const route = data.routes?.[0]
      const encoded = route?.polyline?.encodedPolyline
      const seconds = Number(/^(\d+(?:\.\d+)?)s$/.exec(route?.duration ?? '')?.[1])
      const meters = Number(route?.distanceMeters)
      if (!encoded || !Number.isFinite(seconds) || !Number.isFinite(meters)) {
        throw new GoogleHttpError(502, 'Google could not find a walking route.')
      }
      const path = decodePolyline(encoded)
      if (path.length < 2) throw new GoogleHttpError(502, 'Google could not find a walking route.')
      return remember(key, {
        source: 'google', label: GOOGLE_ROUTE_LABEL,
        distanceMeters: Math.round(meters), durationSeconds: Math.round(seconds), path,
      })
    },

    async place(placeId: string): Promise<GooglePlaceDetails> {
      if (!config?.placesEnabled) throw new GoogleHttpError(503, 'Google place details are not enabled.', NOT_ENABLED)
      if (!PLACE_ID.test(placeId)) throw new GoogleHttpError(400, 'Invalid place.')
      const hit = recall<GooglePlaceDetails>('place:' + placeId)
      if (hit) return hit
      const response = await http(PLACES + 'places/' + encodeURIComponent(placeId), {
        headers: {
          'X-Goog-Api-Key': config.apiKey,
          'X-Goog-FieldMask': 'displayName,regularOpeningHours.weekdayDescriptions,photos',
        },
      })
      if (!response.ok) throw new GoogleHttpError(502, 'Google could not find that place.')
      const data = await response.json() as {
        displayName?: { text?: string }
        regularOpeningHours?: { weekdayDescriptions?: string[] }
        photos?: { name?: string; authorAttributions?: { displayName?: string; uri?: string }[] }[]
      }
      let photo: GooglePlaceDetails['photo'] = null
      const first = data.photos?.[0]
      if (first?.name && /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(first.name)) {
        // skipHttpRedirect returns a key-free photo address, so the browser
        // never sees the server key.
        const media = await http(`${PLACES}${first.name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
          headers: { 'X-Goog-Api-Key': config.apiKey },
        })
        const uri = media.ok ? String((await media.json() as { photoUri?: unknown }).photoUri ?? '') : ''
        if (uri.startsWith('https://')) {
          photo = {
            url: uri,
            attributions: (first.authorAttributions ?? []).slice(0, 3).map(a => ({
              name: String(a.displayName ?? 'Google user').slice(0, 80),
              uri: typeof a.uri === 'string' && a.uri.startsWith('https://') ? a.uri : null,
            })),
          }
        }
      }
      return remember('place:' + placeId, {
        name: String(data.displayName?.text ?? '').slice(0, 120),
        hours: (data.regularOpeningHours?.weekdayDescriptions ?? []).slice(0, 7).map(s => String(s).slice(0, 120)),
        photo,
        credit: 'Google',
      })
    },
  }
}

export type GoogleRoutesService = ReturnType<typeof createGoogleRoutesService>

/** Who is signed in on this request (null when nobody), checked with Supabase Auth. */
export type RequestSession = (req: IncomingMessage) => Promise<{ userId: string } | null>

/** POST /api/google/route and GET /api/google/place?id=... Both need a signed-in SideQuest session. */
export function createGoogleRoutesApi(service: GoogleRoutesService, session: RequestSession = async () => null, clock: () => number = Date.now) {
  const limit = createRateLimiter(60, 60_000, clock)
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = pathOf(req)
    if (!url || (url.pathname !== '/api/google/route' && url.pathname !== '/api/google/place')) return false
    try {
      limit(clientIp(req))
      if (url.pathname === '/api/google/route') {
        if (!service.enabled) throw new GoogleHttpError(503, 'Google walking routes are not enabled.', NOT_ENABLED)
        if (req.method !== 'POST') throw new GoogleHttpError(405, 'Use POST.')
        requireSameOrigin(req)
        if (!await session(req)) throw new GoogleHttpError(401, 'Sign in to SideQuest first.', 'signed_out')
        const data = await readJson(req)
        const from = point(data.from), to = point(data.to)
        if (!from || !to) throw new GoogleHttpError(400, 'Invalid route.')
        sendJson(res, 200, await service.walk(from, to))
      } else {
        if (!service.placesEnabled) throw new GoogleHttpError(503, 'Google place details are not enabled.', NOT_ENABLED)
        if (req.method !== 'GET') throw new GoogleHttpError(405, 'Use GET.')
        if (!await session(req)) throw new GoogleHttpError(401, 'Sign in to SideQuest first.', 'signed_out')
        sendJson(res, 200, await service.place(url.searchParams.get('id') ?? ''))
      }
    } catch (error) {
      sendError(res, error, 'Google maps are unavailable right now.')
    }
    return true
  }
}
