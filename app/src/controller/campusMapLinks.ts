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
