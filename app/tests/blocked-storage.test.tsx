// @vitest-environment jsdom
// A browser that blocks storage (private modes, strict settings) must still show SideQuest:
// plans and ideas live in memory for the visit, and one short line says they won't be kept.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App'
import { toEventRow, type CampusEvent, type EventCatalogPort } from '../src/model/eventCatalog'
import { LOCAL_CATALOG_KEY } from '../src/model/browserEventTable'
import { connectBrowserEventCatalog } from '../src/controller/postEvent'

const E1 = '00000000-0000-4000-8000-000000000001'
const event: CampusEvent = { id: E1, title: 'Ceramics', description: 'Clay', hostName: 'Art Club', location: 'Dowd', date: '2030-11-08', start: '14:00', end: '15:00' }
const catalog: EventCatalogPort = { create: vi.fn(), listUpcoming: async () => [event], getById: async id => id === E1 ? event : null }
const real = Object.getOwnPropertyDescriptor(window, 'localStorage')!

afterEach(() => { cleanup(); Object.defineProperty(window, 'localStorage', real); vi.restoreAllMocks() })

describe('storage blocked by the browser', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError') } })
  })
  it.each(['#discover', '#schedule', '#someday', '#map', '#post'])('%s still renders, with one line saying plans won\'t be kept', async hash => {
    location.hash = hash
    render(<App catalog={{ catalog, shared: true }} quiet />)
    expect(document.querySelector('h1')).not.toBeNull()
    expect(await screen.findByText("This browser won't save your plans.")).toBeTruthy()
  })
  it('plans an event in memory for the visit', async () => {
    location.hash = '#discover'
    render(<App catalog={{ catalog, shared: true }} />)
    await screen.findAllByText('Ceramics')
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: /Ceramics/ })[0]) })
    const plan = await screen.findByRole('button', { name: /Plan to attend|Plan it/ })
    await act(async () => { fireEvent.click(plan) })
    expect(await screen.findByText(/Added “Ceramics” to My Schedule/)).toBeTruthy()
  })
})

describe('damaged events saved in this browser', () => {
  beforeEach(() => { localStorage.clear(); location.hash = '#discover' })
  it('Discover offers the recovery My Schedule offers, and keeps every event that still reads', async () => {
    const { id: _, ...draft } = event
    const good = { ...toEventRow(draft), id: E1 }
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify([good, { id: 7, title: null }]))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App catalog={connectBrowserEventCatalog({})} now={() => new Date('2030-11-07T09:00:00-08:00')} />)
    expect(await screen.findByText('Saved events could not be read. They have not been overwritten.')).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Recover valid events' })) })
    expect((await screen.findAllByText('Ceramics')).length).toBeGreaterThan(0)
    expect(JSON.parse(localStorage.getItem(LOCAL_CATALOG_KEY)!)).toHaveLength(1)
  })
  it('leaves the damaged data alone when the student says no', async () => {
    localStorage.setItem(LOCAL_CATALOG_KEY, '{not json')
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App catalog={connectBrowserEventCatalog({})} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Recover valid events' }))
    expect(localStorage.getItem(LOCAL_CATALOG_KEY)).toBe('{not json')
  })
})
