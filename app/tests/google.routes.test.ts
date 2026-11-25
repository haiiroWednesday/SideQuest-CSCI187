import { describe, expect, it } from 'vitest'
import {
  GOOGLE_ROUTE_LABEL, createGoogleRoutesService, decodePolyline, routesConfigFromEnv,
} from '../server/googleRoutes'

const KEY = 'test-maps-server-key-0123456789'
const benson = { lat: 37.34936, lng: -121.94052 }
const nearCafe = { lat: 37.35281, lng: -121.93612 } // a few blocks off campus
const sanFrancisco = { lat: 37.7749, lng: -122.4194 }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })

function fake(reply: () => Response) {
  const calls: { url: string; init?: RequestInit }[] = []
  return { calls, fetch: async (url: string, init?: RequestInit) => { calls.push({ url, init }); return reply() } }
}

describe('Google walking routes for near-campus places', () => {
  it('stays off without the flag or a real-looking server key', () => {
    expect(routesConfigFromEnv({ SIDEQUEST_GOOGLE_ROUTES_ENABLED: 'true', GOOGLE_MAPS_SERVER_KEY: KEY })).toEqual({ apiKey: KEY, placesEnabled: false })
    expect(routesConfigFromEnv({ GOOGLE_MAPS_SERVER_KEY: KEY })).toBeNull()
    expect(routesConfigFromEnv({ SIDEQUEST_GOOGLE_ROUTES_ENABLED: 'true', GOOGLE_MAPS_SERVER_KEY: 'x' })).toBeNull()
  })

  it('decodes Google encoded polylines', () => {
    // Google's documented example.
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]])
  })

  it('asks Google for a WALK route with a field mask and returns a path our map draws', async () => {
    const google = fake(() => json({ routes: [{ duration: '412s', distanceMeters: 531, polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC' } }] }))
    const service = createGoogleRoutesService({ apiKey: KEY, placesEnabled: false }, { fetch: google.fetch })
    const route = await service.walk(benson, nearCafe)
    expect(route).toEqual({
      source: 'google', label: GOOGLE_ROUTE_LABEL, distanceMeters: 531, durationSeconds: 412,
      path: [[38.5, -120.2], [40.7, -120.95]],
    })
    expect(route.label).toBe('Google route, not checked on foot')
    const call = google.calls[0]
    expect(call.url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes')
    const headers = new Headers(call.init?.headers)
    expect(headers.get('x-goog-api-key')).toBe(KEY)
    expect(headers.get('x-goog-fieldmask')).toBe('routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline')
    expect(JSON.parse(String(call.init?.body))).toMatchObject({
      travelMode: 'WALK',
      origin: { location: { latLng: { latitude: benson.lat, longitude: benson.lng } } },
      destination: { location: { latLng: { latitude: nearCafe.lat, longitude: nearCafe.lng } } },
    })
  })

  it('caches a route for ten minutes', async () => {
    let now = 0
    const google = fake(() => json({ routes: [{ duration: '60s', distanceMeters: 80, polyline: { encodedPolyline: '_p~iF~ps|U_ulLnnqC' } }] }))
    const service = createGoogleRoutesService({ apiKey: KEY, placesEnabled: false }, { fetch: google.fetch, clock: () => now })
    await service.walk(benson, nearCafe)
    await service.walk(benson, nearCafe)
    expect(google.calls).toHaveLength(1)
    now += 11 * 60_000
    await service.walk(benson, nearCafe)
    expect(google.calls).toHaveLength(2)
  })

  it('refuses places far from campus without calling Google', async () => {
    const google = fake(() => json({}))
    const service = createGoogleRoutesService({ apiKey: KEY, placesEnabled: false }, { fetch: google.fetch })
    await expect(service.walk(benson, sanFrancisco)).rejects.toMatchObject({ status: 422, code: 'too_far' })
    await expect(service.walk(sanFrancisco, benson)).rejects.toMatchObject({ code: 'too_far' })
    expect(google.calls).toHaveLength(0)
  })

  it('reports a broken Google answer instead of drawing a made-up line', async () => {
    const service = createGoogleRoutesService({ apiKey: KEY, placesEnabled: false }, { fetch: fake(() => json({ routes: [] })).fetch })
    await expect(service.walk(benson, nearCafe)).rejects.toMatchObject({ status: 502 })
  })

  it('says plainly when routes are not enabled', async () => {
    await expect(createGoogleRoutesService(null).walk(benson, nearCafe)).rejects.toMatchObject({ status: 503, code: 'not_enabled' })
  })
})

describe('Google place details', () => {
  it('returns hours and a key-free photo address with its author credit', async () => {
    const calls: string[] = []
    const fetch = async (url: string) => {
      calls.push(url)
      if (url.includes('/media?')) return json({ photoUri: 'https://lh3.googleusercontent.com/places/abc' })
      return json({
        displayName: { text: 'Mission Coffee' },
        regularOpeningHours: { weekdayDescriptions: ['Monday: 7:00 AM – 6:00 PM'] },
        photos: [{ name: 'places/ChIJplace123456/photos/photoRef1', authorAttributions: [{ displayName: 'Ana P.', uri: 'https://maps.google.com/maps/contrib/1' }] }],
      })
    }
    const service = createGoogleRoutesService({ apiKey: KEY, placesEnabled: true }, { fetch })
    const place = await service.place('ChIJplace123456')
    expect(place).toEqual({
      name: 'Mission Coffee',
      hours: ['Monday: 7:00 AM – 6:00 PM'],
      photo: { url: 'https://lh3.googleusercontent.com/places/abc', attributions: [{ name: 'Ana P.', uri: 'https://maps.google.com/maps/contrib/1' }] },
      credit: 'Google',
    })
    expect(JSON.stringify(place)).not.toContain(KEY)
    expect(calls[1]).toContain('skipHttpRedirect=true')
  })

  it('has its own flag', async () => {
    const service = createGoogleRoutesService({ apiKey: KEY, placesEnabled: false })
    await expect(service.place('ChIJplace123456')).rejects.toMatchObject({ code: 'not_enabled' })
  })
})
