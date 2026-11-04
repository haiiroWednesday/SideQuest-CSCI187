// @vitest-environment jsdom
// UI regressions for Devonny's browse-details behavior in the integrated M2.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { PLANNED_IDS_KEY } from '../src/model/schedule'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'

const FIRST = '11111111-1111-4111-8111-111111111111'
const SECOND = '22222222-2222-4222-8222-222222222222'
const now = () => new Date('2030-11-07T09:00:00-08:00')
const first: CampusEvent = {
  id: FIRST, title: 'Art Workshop', hostName: 'Campus Arts',
  description: 'Catalog list snapshot.', location: 'Arts Building',
  date: '2030-11-07', start: '14:30', end: '15:30',
}
const second: CampusEvent = {
  ...first, id: SECOND, hostName: 'Another Club', description: 'Another event with the same title.',
  start: '16:00', end: '17:00',
}
function catalog(
  getById: EventCatalogPort['getById'],
  list: CampusEvent[] = [first],
): EventCatalogPort {
  return {
    create: vi.fn(async draft => ({ ...draft, id: FIRST })),
    listUpcoming: vi.fn(async () => list),
    getById,
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}
beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = '#discover'
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Discover selected details: safe actions and usability', () => {
  it('hides the planning action during verification, then saves the verified event ID only', async () => {
    const pending = deferred<CampusEvent | null>()
    const getById = vi.fn(() => pending.promise)
    render(<App catalog={{ catalog: catalog(getById), shared: true }} now={now} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'View details for Art Workshop' }))
    const panel = screen.getByRole('complementary')
    expect(within(panel).getByText('Checking the latest event details…')).toBeTruthy()
    expect(within(panel).queryByRole('button', { name: '+ Plan to attend' })).toBeNull()
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBeNull()

    await act(async () => { pending.resolve({ ...first, description: 'Verified event details.' }) })
    expect(within(panel).getByText('Verified event details.')).toBeTruthy()
    const save = within(panel).getByRole('button', { name: '+ Plan to attend' })
    await user.click(save)
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(PLANNED_IDS_KEY) ?? '[]')).toEqual([FIRST]))
    expect(within(panel).getByRole('button', { name: 'In My Schedule' })).toBeTruthy()
  })

  it('does not save a plan for a missing record or a mismatched successful response', async () => {
    const user = userEvent.setup()
    const missingCatalog = catalog(async () => null)
    const { unmount } = render(<App catalog={{ catalog: missingCatalog, shared: true }} now={now} />)
    await user.click(await screen.findByRole('button', { name: 'View details for Art Workshop' }))
    const panel = screen.getByRole('complementary')
    expect(await within(panel).findByText('This event is no longer available in the public catalog.')).toBeTruthy()
    expect(within(panel).queryByRole('button', { name: '+ Plan to attend' })).toBeNull()
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBeNull()
    unmount()

    const wrongCatalog = catalog(async () => ({ ...second }))
    render(<App catalog={{ catalog: wrongCatalog, shared: true }} now={now} />)
    await user.click(await screen.findByRole('button', { name: 'View details for Art Workshop' }))
    expect(await screen.findByText(/latest event details could not be verified/)).toBeTruthy()
    expect(screen.getByRole('complementary').querySelector('.sq-plan-button')).toBeNull()
    expect(window.localStorage.getItem(PLANNED_IDS_KEY)).toBeNull()
  })

  it('uses the refreshed event fields, without mixing them with the old list snapshot', async () => {
    const updated = {
      ...first, hostName: 'Updated Art Club', location: 'Library Terrace',
      description: 'Latest description', start: '13:00', end: '14:00',
    }
    render(<App catalog={{ catalog: catalog(async () => updated), shared: true }} now={now} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Art Workshop' }))
    const panel = screen.getByRole('complementary')
    expect(await within(panel).findByText('Latest description')).toBeTruthy()
    expect(within(panel).getByText('Updated Art Club')).toBeTruthy()
    expect(within(panel).getByText('Library Terrace')).toBeTruthy()
    expect(within(panel).queryByText('Catalog list snapshot.')).toBeNull()
    expect(within(panel).queryByText('Arts Building')).toBeNull()
  })

  it('preserves separate IDs for identically titled events when a plan is saved', async () => {
    const getById = vi.fn(async id => id === SECOND ? second : first)
    render(<App catalog={{ catalog: catalog(getById, [first, second]), shared: true }} now={now} />)
    const sameTitle = await screen.findAllByRole('button', { name: 'View details for Art Workshop' })
    await userEvent.click(sameTitle[1])
    const panel = screen.getByRole('complementary')
    expect(await within(panel).findByText('Another event with the same title.')).toBeTruthy()
    await userEvent.click(within(panel).getByRole('button', { name: '+ Plan to attend' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(PLANNED_IDS_KEY) ?? '[]')).toEqual([SECOND]))
    expect(getById).toHaveBeenCalledWith(SECOND)
  })

  it('does not show details from an earlier selection after a zero-match filter is applied', async () => {
    const revised = { ...first, description: 'Verified earlier selection.' }
    render(<App catalog={{ catalog: catalog(async () => revised), shared: true }} now={now} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Art Workshop' }))
    expect(await screen.findByText('Verified earlier selection.')).toBeTruthy()
    const search = screen.getByRole('search', { name: 'When are you free?' })
    fireEvent.change(within(search).getByLabelText('Free on'), { target: { value: '2030-11-08' } })
    fireEvent.change(within(search).getByLabelText('from'), { target: { value: '09:00' } })
    fireEvent.change(within(search).getByLabelText('until'), { target: { value: '10:00' } })
    expect(screen.getByText('No events fit this window.')).toBeTruthy()
    expect(screen.queryByText('Verified earlier selection.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'View details for Art Workshop' })).toBeNull()
  })

  it('makes the mobile detail sheet a dialog and restores focus on Escape', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, media: '(max-width: 760px)',
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(),
    })))
    render(<App catalog={{ catalog: catalog(async () => first), shared: true }} now={now} />)
    const user = userEvent.setup()
    const ticket = await screen.findByRole('button', { name: 'View details for Art Workshop' })
    await user.click(ticket)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close details' })))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(ticket)
  })
})
