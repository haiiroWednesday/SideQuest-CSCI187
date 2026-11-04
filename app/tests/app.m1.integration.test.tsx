// @vitest-environment jsdom
// Keep coverage for legacy Remove/Undo, recovery, and multi-tab safety.
// Search now reads the EventCatalog; legacy records are not published.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { STORAGE_KEY, type CampusEvent } from '../src/model/events'
import { createEventCatalog, toEventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'

// Dynamically choose a future date so these UI tests don't expire as
// calendar time passes. Model tests can instead inject a fixed clock.
function futureDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

const workshop = (overrides: Partial<CampusEvent> = {}): CampusEvent => ({
  id: 'm1-workshop-1', title: 'Art Workshop', location: 'Arts Building',
  date: futureDate(), start: '14:30', end: '15:30', ...overrides,
})

// Put M1 events in browser storage the way the M1 form used to.
function seed(events: CampusEvent[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

function sharedCatalog(events: CampusEvent[]) {
  const rows = new Map(events.map(event => [
    event.id, { ...toEventRow({ ...event, hostName: 'SCU club', description: event.description ?? 'Campus event' }), id: event.id },
  ]))
  return { catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }
}

// Set Discover's free-time window: the seeded event runs 2:30–3:30pm.
function searchOn(date: string, start = '14:00', end = '16:00') {
  fireEvent.change(screen.getByLabelText('Free on'), { target: { value: date } })
  fireEvent.change(screen.getByLabelText('from'), { target: { value: start } })
  fireEvent.change(screen.getByLabelText('until'), { target: { value: end } })
}

// The legacy M1 list and its Remove/Undo/recovery live on the Post page.
beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = '#post'
})
const goTo = (hash: string) => act(async () => { window.location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')) })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('M1 rendered user workflow', () => {
  it('shows a catalog event in full-fit results without publishing a legacy record', async () => {
    window.location.hash = '#discover'
    seed([workshop({ title: 'Legacy workshop' })])
    render(<App catalog={sharedCatalog([workshop()])} />)
    await screen.findByRole('button', { name: 'View details for Art Workshop' })
    searchOn(futureDate())

    const stub = screen.getByRole('button', { name: 'View details for Art Workshop' })
    expect(within(stub).getByText('Fits your window')).toBeTruthy()
    expect(screen.getByText('1 event fits')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'View details for Legacy workshop' })).toBeNull()

    await goTo('#post')
    expect(screen.getByRole('button', { name: 'Remove Legacy workshop' })).toBeTruthy()
    expect(screen.getByText('1 total')).toBeTruthy()
  })

  it('R2: preserves events across unmount/reload and persists removal', async () => {
    const user = userEvent.setup()
    seed([workshop()])
    render(<App />)
    expect(screen.getByRole('button', { name: 'Remove Art Workshop' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    expect(screen.getByRole('status').textContent).toContain('Event removed.')
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual([])
    })

    cleanup() // Simulates closing the page; storage is intentionally preserved.
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Remove Art Workshop' })).toBeNull()
    expect(screen.getByText('No legacy events saved in this browser.')).toBeTruthy()
  })

  it('R3/R4: displays both empty-search states and an invalid-search message', async () => {
    window.location.hash = '#discover'
    render(<App />)
    expect(await screen.findByText('No events to show yet.')).toBeTruthy()
    cleanup()

    render(<App catalog={sharedCatalog([workshop()])} />)
    await screen.findByRole('button', { name: 'View details for Art Workshop' })
    searchOn(futureDate(), '17:00', '18:00')
    expect(screen.getByRole('heading', { name: /^No event fits all of / })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'See all upcoming events' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('until'), { target: { value: '16:00' } })
    expect(screen.getByRole('alert').textContent).toContain('Please choose an end time later')
    // An invalid window filters nothing: every event stays listed while it is corrected.
    expect(screen.getByRole('button', { name: 'View details for Art Workshop' })).toBeTruthy()

    // Clearing the date means "no window": Discover goes back to listing everything, with no error.
    fireEvent.change(screen.getByLabelText('until'), { target: { value: '18:00' } })
    fireEvent.change(screen.getByLabelText('Free on'), { target: { value: '' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'View details for Art Workshop' })).toBeTruthy()
  })

  it('R2/R4: warns when a list change cannot be persisted', async () => {
    const user = userEvent.setup()
    seed([workshop()])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage denied')
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Browser storage could not save')
    })
  })

  it('R1/R3: shows catalog descriptions and human-readable dates and times', async () => {
    window.location.hash = '#discover'
    const date = futureDate()
    render(<App catalog={sharedCatalog([workshop({ title: 'Two Choirs', description: 'A cappella rehearsals', location: 'Music Hall', date })])} />)
    searchOn(date)

    const ticket = within(await screen.findByRole('complementary'))
    expect(ticket.getByText('A cappella rehearsals')).toBeTruthy()
    const [year, month, day] = date.split('-')
    expect(ticket.getAllByText(`${Number(month)}/${Number(day)}/${year}`)).toHaveLength(1)
    expect(ticket.getByText('until 3:30pm · 1 hr')).toBeTruthy()
    const stub = within(screen.getByRole('button', { name: 'View details for Two Choirs' }))
    expect(stub.getByText('2:30').textContent).toBe('2:30pm')
    expect(stub.getByText('to 3:30pm')).toBeTruthy()
  })

  it('R2: offers an Undo button after removing a saved event', async () => {
    const user = userEvent.setup()
    seed([workshop()])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    await user.click(screen.getByRole('button', { name: 'Undo removal' }))
    expect(screen.getByRole('button', { name: 'Remove Art Workshop' })).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(1)
  })

  it('R2/R4: keeps malformed storage intact until recovery is confirmed', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{corrupt json')
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{corrupt json')
    expect(screen.getByText(/Some saved browser data could not be read/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Recover valid events' }))
    expect(confirm).toHaveBeenCalled()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })

  it('R2: refuses to overwrite an unseen change from another browser tab', async () => {
    const user = userEvent.setup()
    seed([workshop()])
    render(<App />)
    const remote = [{ id: 'tab-b', title: 'Other Tab', location: 'Library', date: futureDate(), start: '09:00', end: '10:00' }]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
    // Do not deliver a storage event yet: the View still has stale state.
    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    expect(screen.getByRole('alert').textContent).toContain('another tab')
    expect(screen.getByRole('button', { name: 'Remove Other Tab' })).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(remote)
  })

  it('R2: reflects changes from another browser tab without clobbering the write', () => {
    render(<App />)
    const remote = [{ id: 'remote', title: 'Remote', location: 'SCU', date: futureDate(), start: '14:30', end: '15:30' }]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
    fireEvent(window, new StorageEvent('storage', { key: STORAGE_KEY, storageArea: window.localStorage }))
    expect(screen.getByRole('button', { name: 'Remove Remote' })).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(remote)
  })

  it('R2/R4: recovers from malformed saved JSON without crashing the UI', () => {
    window.localStorage.setItem(STORAGE_KEY, '{corrupt json')
    render(<App />)
    expect(screen.getByText('No legacy events saved in this browser.')).toBeTruthy()
    expect(screen.getByText('0 total')).toBeTruthy()
  })

  it('does not claim a legacy removal was saved if browser writes fail', async () => {
    const user = userEvent.setup()
    seed([workshop()])
    render(<App />)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota') })
    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    expect(screen.getByRole('status').textContent).toContain('removed temporarily')
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('Art Workshop')
  })

  it('does not claim a legacy Undo was persisted if browser writes fail', async () => {
    const user = userEvent.setup()
    seed([workshop()])
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota') })
    await user.click(screen.getByRole('button', { name: 'Undo removal' }))
    expect(screen.getByRole('status').textContent).toContain('restored temporarily')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })

  it('compares a second write with the last persisted list, not failed local state', async () => {
    const user = userEvent.setup()
    seed([workshop(), workshop({ id: 'second', title: 'Choir Practice' })])
    render(<App />)
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw Error('quota once') })
    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    write.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Remove Choir Practice' }))
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual([])
    expect(screen.queryByText(/Your events changed in another tab/)).toBeNull()
  })

  it('keeps unsaved legacy edits visible when another tab writes', async () => {
    const user = userEvent.setup()
    seed([workshop()])
    render(<App />)
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw Error('quota once') })
    await user.click(screen.getByRole('button', { name: 'Remove Art Workshop' }))
    write.mockRestore()
    const remote = [workshop({ id: 'remote', title: 'Remote Change' })]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
    fireEvent(window, new StorageEvent('storage', { key: STORAGE_KEY, storageArea: window.localStorage }))
    expect(screen.queryByRole('button', { name: 'Remove Remote Change' })).toBeNull()
    expect(screen.getAllByRole('alert').some(alert => alert.textContent?.includes('Another tab changed saved events'))).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(remote)
  })
})
