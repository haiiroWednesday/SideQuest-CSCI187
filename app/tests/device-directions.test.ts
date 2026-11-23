import { describe, expect, it, vi } from 'vitest'
import { googleMapsWalkingDirectionsUrl } from '../src/controller/campusMapLinks'
import { requestDeviceLocation } from '../src/controller/deviceLocation'

describe('explicit device-location walking directions handoff', () => {
  it('constructs a Google Maps walking URL with only valid device coordinates and literal venue', () => {
    const url = new URL(googleMapsWalkingDirectionsUrl('  Music Hall, SCU  ', {
      latitude: 37.349, longitude: -121.94,
    })!)
    expect(url.origin).toBe('https://www.google.com')
    expect(url.pathname).toBe('/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('travelmode')).toBe('walking')
    expect(url.searchParams.get('origin')).toBe('37.349000,-121.940000')
    expect(url.searchParams.get('destination')).toBe('Music Hall, SCU')
    expect(url.searchParams.has('destination_place_id')).toBe(false)
  })

  it('rejects unavailable virtual venues and invalid or fabricated coordinates', () => {
    const point = { latitude: 37.35, longitude: -121.94 }
    expect(googleMapsWalkingDirectionsUrl('Zoom webinar', point)).toBeNull()
    expect(googleMapsWalkingDirectionsUrl('TBA', point)).toBeNull()
    expect(googleMapsWalkingDirectionsUrl('Music Hall', { ...point, latitude: 91 })).toBeNull()
    expect(googleMapsWalkingDirectionsUrl('Music Hall', { ...point, longitude: Infinity })).toBeNull()
    expect(googleMapsWalkingDirectionsUrl('Music Hall', { ...point, latitude: NaN })).toBeNull()
  })

  it('does not request location until explicitly invoked, and requests one low-power reading', async () => {
    const ask = vi.fn((success: PositionCallback, _error?: PositionErrorCallback, _options?: PositionOptions) => {
      success({ coords: { latitude: 37.349, longitude: -121.94 } } as GeolocationPosition)
    })
    expect(ask).not.toHaveBeenCalled()
    const result = await requestDeviceLocation({ getCurrentPosition: ask })
    expect(result).toEqual({ status: 'ready', coordinates: {
      latitude: 37.349, longitude: -121.94,
    } })
    expect(ask).toHaveBeenCalledTimes(1)
    expect(ask.mock.calls[0]).toHaveLength(3)
    expect(ask.mock.calls[0][2]).toEqual({
      enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000,
    })
  })

  it('reports denied permission and unavailable position without leaking location or throwing', async () => {
    const denied = await requestDeviceLocation({
      getCurrentPosition: (_ok, failure) => failure?.({ code: 1 } as GeolocationPositionError),
    })
    expect(denied).toEqual({ status: 'error', reason: 'denied' })
    const invalid = await requestDeviceLocation({
      getCurrentPosition: success => success({ coords: { latitude: 100, longitude: 1 } } as GeolocationPosition),
    })
    expect(invalid).toEqual({ status: 'error', reason: 'unavailable' })
    const timeout = await requestDeviceLocation({
      getCurrentPosition: (_ok, failure) => failure?.({ code: 3 } as GeolocationPositionError),
    })
    expect(timeout).toEqual({ status: 'error', reason: 'timeout' })
  })
})
