// @vitest-environment jsdom
// Discover has no map of its own any more (owner decision, Nov 25): one campus map, on the Map tab.
// In place of the List/Map switch sits one ink link, shown only while something fits.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { DiscoverView, type DiscoverEvent, type MarkerProps } from '../src/view/DiscoverView'
import { presentDiscover } from '../src/controller/presentScreens'
import { addBusy, freeWindows, presentMarks, type MarkInput } from '../src/controller/freeMarks'
import { MAP_FITS_ROUTE } from '../src/controller/presentMap'

afterEach(() => cleanup())

// Tuesday 24 November 2026, 10:40 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const ev = (id: string, title: string, start: string, end: string): DiscoverEvent =>
  ({ id, title, date: DAY, start, end, hostName: 'Club', location: 'Benson', description: 'x' })
const talk = ev('talk', 'Quick talk', '13:15', '13:45')
const late = ev('late', 'Late show', '20:00', '21:00')
const routes = { discover: '#discover', map: '#map', schedule: '#schedule' }
// Free mode, 1:10 to 1:55 today.
const blank: MarkInput = { events: [talk, late], plannedIds: [], now: NOW, marks: {}, open: {}, mode: 'free' }
const input: MarkInput = { ...blank, open: addBusy({ ...blank, marks: {}, date: DAY }, '13:10', '13:55')! }
const marker: MarkerProps = {
  model: presentMarks(input), onDate: () => {}, onWhen: () => {}, onAddBusy: () => true, onFillGap: () => {},
  onUnbusy: () => {}, onReshape: () => {}, onClear: () => {},
}
const link = () => screen.queryByRole('link', { name: 'See these on the map' })

describe("Discover's link to the one campus map", () => {
  it('shows above the list while events fit, and goes to the Map tab with the filter on', () => {
    render(<DiscoverView screen={presentDiscover({ events: [talk, late], freeWindows: freeWindows(input), now: NOW })} marker={marker} routes={routes} />)
    expect(link()?.getAttribute('href')).toBe(MAP_FITS_ROUTE)
    expect(link()?.className).toContain('sq-look-link')
    // It sits right above the event list.
    const board = document.querySelector('.sq-board')!
    expect(link()!.closest('p')!.nextElementSibling).toBe(board)
  })
  it('is not shown when nothing fits', () => {
    render(<DiscoverView screen={presentDiscover({ events: [late], freeWindows: freeWindows(input), now: NOW })} marker={marker} routes={routes} />)
    expect(link()).toBeNull()
  })
  it('is not shown while Discover lists every event, with no free time to fit', () => {
    render(<DiscoverView screen={presentDiscover({ events: [talk, late], now: NOW })} routes={routes} />)
    expect(link()).toBeNull()
  })
  it('replaces the List/Map switch and the map inside Discover', () => {
    render(<DiscoverView screen={presentDiscover({ events: [talk, late], freeWindows: freeWindows(input), now: NOW })} marker={marker} routes={routes} />)
    expect(screen.queryByRole('group', { name: 'Show events as' })).toBeNull()
    expect(document.querySelector('.sq-viewswitch, .sq-disc-map, iframe')).toBeNull()
    expect(document.querySelector('.sq-board')!.hasAttribute('hidden')).toBe(false)
  })
  it('the free-time header link, in the look that shows it, goes to the same place', () => {
    render(<DiscoverView screen={presentDiscover({ events: [talk, late], freeWindows: freeWindows(input), now: NOW })} marker={marker} routes={routes} />)
    expect(document.querySelector('.sq-look-link-map')?.getAttribute('href')).toBe(MAP_FITS_ROUTE)
  })
})
