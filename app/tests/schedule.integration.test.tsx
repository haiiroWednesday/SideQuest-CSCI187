// @vitest-environment jsdom
// Sembiyan: actual View -> Controller -> Model interactions and page navigation.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'
import { PLANNED_IDS_KEY } from '../src/model/schedule'

const events: CampusEvent[] = [
  { id: 'late', title: 'Late concert', location: 'Theatre', date: '2030-11-02', start: '14:30', end: '15:30' },
  { id: 'early', title: 'Early workshop', location: 'Library', date: '2030-11-01', start: '14:30', end: '15:30' },
  { id: 'overlap', title: 'Choir', location: 'Music', date: '2030-11-01', start: '15:00', end: '16:00' },
  { id: 'touching', title: 'Too late', location: 'SCU', date: '2030-11-01', start: '16:00', end: '17:00' },
].map(event => ({ ...event, hostName: 'SCU club', description: 'Campus event' }))

function catalogFixture(upcoming = events): EventCatalogPort {
  return {
    create: vi.fn(),
    listUpcoming: vi.fn(async () => upcoming),
    getById: vi.fn(async id => events.find(event => event.id === id) ?? null),
  }
}

function renderApp(catalog = catalogFixture()) {
  return render(<App catalog={{ catalog, shared: true }} />)
}

beforeEach(() => {
  window.location.hash = ''
  window.localStorage.clear()
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const chooseSearch = () => {
  fireEvent.change(screen.getByLabelText('Free on'), { target: { value: '2030-11-01' } })
  fireEvent.change(screen.getByLabelText('from'), { target: { value: '14:00' } })
  fireEvent.change(screen.getByLabelText('until'), { target: { value: '16:00' } })
}
const nav = () => within(screen.getByRole('navigation', { name: 'SideQuest primary' }))
const feedback = () => within(document.querySelector<HTMLElement>('.schedule-feedback')!)
const details = () => within(screen.getByRole('complementary'))
// Discover: pick the stub, then plan from its ticket.
async function planFromDiscover(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(await screen.findByRole('button', { name: `View details for ${title}` }))
  expect(details().getByRole('heading', { name: title })).toBeTruthy()
  await user.click(details().getByRole('button', { name: '+ Plan to attend' }))
}

describe('personal Schedule rendered workflow', () => {
  it('shows a separate empty Schedule page with a route back to Discover', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(nav().getByRole('link', { name: 'My Schedule' }))
    expect(await screen.findByRole('heading', { name: 'My Schedule.' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Nothing planned yet.' })).toBeTruthy()
    expect(screen.queryByLabelText('from')).toBeNull()
    await user.click(nav().getByRole('link', { name: 'Discover' }))
    expect(await screen.findByLabelText('from')).toBeTruthy()
  })
  it('adds from full-fit results, warns for overlaps, survives reload, and removes only the plan', async () => {
    const user = userEvent.setup()
    const catalog = catalogFixture()
    renderApp(catalog)
    await screen.findByRole('button', { name: 'View details for Too late' })
    chooseSearch()
    // Only full fits stay listed: Too late starts as the window closes.
    expect(screen.queryByRole('button', { name: 'View details for Too late' })).toBeNull()
    await planFromDiscover(user, 'Early workshop')
    expect(feedback().getByRole('status').textContent).toContain('Added')
    await planFromDiscover(user, 'Choir')
    expect(feedback().getByRole('alert').textContent).toContain('Schedule overlap')
    expect(JSON.parse(window.localStorage.getItem(PLANNED_IDS_KEY)!)).toEqual(['early', 'overlap'])
    await user.click(nav().getByRole('link', { name: 'My Schedule' }))
    await screen.findByRole('heading', { name: 'My Schedule.' })
    expect(await screen.findByText('2 plans overlap')).toBeTruthy()
    expect(screen.getAllByText('Overlaps')).toHaveLength(2)
    expect(details().getByText('Overlaps 1 plan')).toBeTruthy()
    expect(details().getByText('Choir')).toBeTruthy()
    // The trail shows the overlap itself; the add-time alert stays on Discover.
    expect(screen.queryByRole('alert')).toBeNull()
    cleanup()
    renderApp(catalog)
    expect(within(await screen.findByRole('complementary')).getByRole('heading', { name: 'Early workshop' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Remove Early workshop from plans' }))
    expect(screen.queryByRole('button', { name: 'View details for Early workshop' })).toBeNull()
    expect(screen.queryByText(/plans overlap/)).toBeNull()
    expect(await catalog.getById('early')).toEqual(events[1])
    await user.click(nav().getByRole('link', { name: 'Discover' }))
    await screen.findByLabelText('from')
    await user.click(await screen.findByRole('button', { name: 'View details for Early workshop' }))
    expect((details().getByRole('button', { name: '+ Plan to attend' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('resolves plans outside the upcoming list, sorts them, and shows confirmed missing events', async () => {
    window.location.hash = '#schedule'
    window.localStorage.setItem(PLANNED_IDS_KEY, '["late","missing","early"]')
    const catalog = catalogFixture([events[1]])
    renderApp(catalog)
    await screen.findByText('An event you planned')
    expect(screen.getAllByRole('button', { name: /^View details for / }).map(b => b.getAttribute('aria-label')))
      .toEqual(['View details for Early workshop', 'View details for Late concert'])
    expect(screen.getAllByText('An event you planned')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Remove unavailable event missing from plans' })).toBeTruthy()
    expect(catalog.getById).toHaveBeenCalledWith('late')
  })
  it('keeps plans while lookup is pending or fails, and retries without marking them missing', async () => {
    window.location.hash = '#schedule'
    window.localStorage.setItem(PLANNED_IDS_KEY, '["early"]')
    const catalog = catalogFixture([])
    let rejectLookup: (reason: Error) => void = () => {}
    const pending = new Promise<CampusEvent | null>((_, reject) => { rejectLookup = reject })
    catalog.getById = vi.fn(() => pending)
    const user = userEvent.setup()
    renderApp(catalog)

    expect(await screen.findByText('Looking up your planned events…')).toBeTruthy()
    expect(screen.queryByText('An event you planned')).toBeNull()
    rejectLookup(new Error('Offline'))
    expect((await screen.findByRole('alert')).textContent).toContain('Some planned events could not be loaded.')
    expect(screen.queryByText('An event you planned')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Recover valid plans' })).toBeNull()
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBe('["early"]')

    vi.mocked(catalog.getById).mockResolvedValue(events[1])
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(within(await screen.findByRole('complementary')).getByRole('heading', { name: 'Early workshop' })).toBeTruthy()
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBe('["early"]')
  })
  it('reports failed saves and does not claim the event was added', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota') })
    renderApp()
    await screen.findByRole('button', { name: 'View details for Early workshop' })
    chooseSearch()
    await planFromDiscover(user, 'Early workshop')
    expect(feedback().getByRole('alert').textContent).toContain('could not save')
    expect(feedback().queryByRole('status')).toBeNull()
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBeNull()
  })
  it('does not overwrite malformed plans until recovery is explicitly confirmed', async () => {
    window.localStorage.setItem(PLANNED_IDS_KEY, '["early",null]')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Recover valid plans' }))
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBe('["early",null]')
    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Recover valid plans' }))
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBe('["early"]')
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('updates plans from another tab without writing the catalog or replacing its plans', async () => {
    window.location.hash = '#schedule'
    const catalog = catalogFixture()
    renderApp(catalog)
    window.localStorage.setItem(PLANNED_IDS_KEY, '["early"]')
    fireEvent(window, new StorageEvent('storage', { key: PLANNED_IDS_KEY, storageArea: window.localStorage }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Early workshop' })).toBeTruthy())
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBe('["early"]')
    expect(catalog.create).not.toHaveBeenCalled()
  })
})

it('shows the 100-event limit in the UI, blocks an extra plan and clears the message after removal', async () => {
  const initialIds = Array.from({ length: 99 }, (_, index) => `older-${index}`)
  window.localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify(initialIds))
  const user = userEvent.setup()
  renderApp()
  await screen.findByRole('button', { name: 'View details for Early workshop' })
  chooseSearch()
  await planFromDiscover(user, 'Early workshop')
  expect(screen.getByText(/Your schedule has reached the 100-event limit/)).toBeTruthy()
  await planFromDiscover(user, 'Choir')
  expect(feedback().getByRole('alert').textContent).toContain('100-event limit')
  expect(JSON.parse(window.localStorage.getItem(PLANNED_IDS_KEY)!)).toHaveLength(100)
  await user.click(nav().getByRole('link', { name: 'My Schedule' }))
  await screen.findByRole('heading', { name: 'My Schedule.' })
  await user.click(await screen.findByRole('button', { name: 'Remove Early workshop from plans' }))
  expect(screen.queryByText(/Your schedule has reached the 100-event limit/)).toBeNull()
  expect(JSON.parse(window.localStorage.getItem(PLANNED_IDS_KEY)!)).toHaveLength(99)
})
