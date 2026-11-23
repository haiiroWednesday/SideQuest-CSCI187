// CONTROLLER: verified provider entrypoints, no inferred building coordinates or
// walking-time estimates. The official SCU map and Google Maps search are fallbacks.
export const OFFICIAL_SCU_CAMPUS_MAP = 'https://www.scu.edu/map/'

export function googleMapsVenueSearchUrl(location: string): string | null {
  const venue = location.trim()
  if (!venue || venue.length > 300 || /^(online|virtual|zoom|remote|tba|tbd|to be announced)(\s|$)/i.test(venue)) {
    return null
  }
  // Search the literal host-supplied venue. Never fabricate a place ID or
  // append the campus to an off-campus address, which may redirect incorrectly.
  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  url.searchParams.set('query', venue)
  return url.toString()
}


export type DeviceCoordinates = { latitude: number; longitude: number }

/** Open Google Maps walking directions only after the student explicitly chooses a
 * destination and grants device-location access. No route or accessible entrance
 * is claimed by SideQuest. The external provider resolves the literal venue. */
export function googleMapsWalkingDirectionsUrl(
  location: string, position: DeviceCoordinates,
): string | null {
  if (!googleMapsVenueSearchUrl(location)) return null
  const { latitude, longitude } = position
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('origin', latitude.toFixed(6) + ',' + longitude.toFixed(6))
  url.searchParams.set('destination', location.trim())
  url.searchParams.set('travelmode', 'walking')
  return url.toString()
}
