// @vitest-environment jsdom
// Discover in two steps (Nov 27): When, then Events. Each step has its own address, older links still land
// on When, and only one step's content shows at a time.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DISCOVER_STEPS, discoverStepFromHash, discoverStepRoute } from '../src/controller/discoverSteps'
import { DiscoverView, type DiscoverEvent, type MarkerProps } from '../src/view/DiscoverView'
import { presentDiscover } from '../src/controller/presentScreens'
import { addBusy, freeWindows, presentMarks, type MarkInput } from '../src/controller/freeMarks'

const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const ev = (id: string, title: string, start: string, end: string): DiscoverEvent =>
  ({ id, title, date: DAY, start, end, hostName: 'Club', location: 'Benson', description: 'x' })
const talk = ev('talk', 'Quick talk', '13:15', '13:45')
const blank: MarkInput = { events: [talk], plannedIds: [], now: NOW, marks: {}, open: {}, mode: 'free' }
const input: MarkInput = { ...blank, open: addBusy({ ...blank, marks: {}, date: DAY }, '13:10', '13:55')! }
const marker: MarkerProps = {
  model: presentMarks(input), onDate: () => {}, onWhen: () => {}, onAddBusy: () => true,
  onUnbusy: () => {}, onReshape: () => {}, onClear: () => {},
}
const show = (withMarker = true) => render(<DiscoverView screen={presentDiscover({ events: [talk], freeWindows: freeWindows(input), now: NOW })}
  marker={withMarker ? marker : undefined} onCategoryChange={() => {}} />)
const go = async (hash: string) => { await act(async () => { location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')) }) }

beforeEach(() => { location.hash = '#discover' })
afterEach(() => { cleanup(); location.hash = '' })

describe('the step addresses', () => {
  it('reads When and Events from the address, and keeps older Discover links working', () => {
    expect(discoverStepFromHash('#discover')).toBe('when')
    expect(discoverStepFromHash('#discover/2026-11-26')).toBe('when')
    expect(discoverStepFromHash('#discover/events')).toBe('events')
    // The old What step was folded into Events.
    expect(discoverStepFromHash('#discover/what')).toBe('events')
    expect(discoverStepFromHash('#discover/nonsense')).toBe('when')
    expect(DISCOVER_STEPS.map(s => discoverStepRoute(s.step))).toEqual(['#discover', '#discover/events'])
  })
})

describe('Discover in steps', () => {
  it('shows one step at a time: the week, then the list with its filters', async () => {
    show()
    expect(screen.getByRole('link', { name: /When/, current: 'step' })).toBeTruthy()
    expect(document.querySelector('.sq-week')).toBeTruthy()
    expect(document.querySelector('.sq-board')).toBeNull()
    expect(document.querySelector('.sq-step-filters')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'See what fits' }))
    await go(location.hash)
    expect(location.hash).toBe('#discover/events')
    expect(document.querySelector('.sq-week')).toBeNull()
    expect(screen.getByRole('button', { name: 'View details for Quick talk' })).toBeTruthy()
    // Interests sit right above the list they change.
    const filters = document.querySelector('.sq-step-filters')!
    expect(filters).toBeTruthy()
    expect(filters.compareDocumentPosition(document.querySelector('.sq-board')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('keeps the count and "Show all events" off the When step', () => {
    show()
    expect(screen.queryByRole('button', { name: 'Show all events' })).toBeNull()
    expect(document.querySelector('.sq-fit-note')).toBeNull()
  })
  it('stays one page without the busy-time week', () => {
    show(false)
    expect(document.querySelector('.sq-steps')).toBeNull()
    expect(screen.getByRole('button', { name: 'View details for Quick talk' })).toBeTruthy()
  })
})
