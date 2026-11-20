import { describe, expect, it } from 'vitest'
import { OFFICIAL_SCU_CAMPUS_MAP, googleMapsVenueSearchUrl } from '../src/controller/campusMapLinks'

describe('campus map entrypoints without guessed locations', () => {
  it('uses the official SCU map with no made-up route or pin', () => {
    expect(OFFICIAL_SCU_CAMPUS_MAP).toBe('https://www.scu.edu/map/')
  })
  it('preserves the exact host-entered venue as a Google Maps search, not an invented place ID', () => {
    const url = new URL(googleMapsVenueSearchUrl('  Music Hall, SCU  ')!)
    expect(url.origin).toBe('https://www.google.com')
    expect(url.pathname).toBe('/maps/search/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('query')).toBe('Music Hall, SCU')
    expect(url.searchParams.has('query_place_id')).toBe(false)
  })
  it('omits nonphysical, missing or excessively long venues', () => {
    expect(googleMapsVenueSearchUrl('')).toBeNull()
    expect(googleMapsVenueSearchUrl('Zoom webinar')).toBeNull()
    expect(googleMapsVenueSearchUrl('TBA')).toBeNull()
    expect(googleMapsVenueSearchUrl('x'.repeat(301))).toBeNull()
  })
  it('does not rewrite real off-campus addresses to the SCU campus', () => {
    const venue = 'SAP Center, San Jose, CA'
    expect(new URL(googleMapsVenueSearchUrl(venue)!).searchParams.get('query')).toBe(venue)
  })
})
