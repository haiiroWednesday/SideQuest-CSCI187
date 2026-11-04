// @vitest-environment jsdom
// M1 requirements R2-R4: exercise the rendered search panel and the legacy
// browser-created event list ("Your created events").
//
// M2 note: the create form now posts to the EventCatalog (see
// tests/posting.daven.form.test.tsx). Nothing writes M1 records through the
// form anymore, so these tests SEED the legacy M1 storage key directly and
// keep checking that search, Remove/Undo, recovery and multi-tab safety
// still work on those records.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { STORAGE_KEY, type CampusEvent } from '../src/model/events'

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

// Point the free-time search at the seeded event's date (14:00–16:00 is the default window).
function searchOn(date: string) {
  fireEvent.change(screen.getByLabelText('Free on date'), { target: { value: date } })
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('M1 rendered user workflow', () => {
  it('R1/R3: shows a stored event in the list and as a full-fit search result', () => {
    seed([workshop()])
    render(<App />)
    searchOn(futureDate())

    expect(screen.getByRole('heading', { name: 'Art Workshop' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Art Workshop' })).toBeTruthy()
    expect(screen.getByText('1 total')).toBeTruthy()
    expect(screen.getByText('1 event')).toBeTruthy()
    expect(screen.getByText('✓ Fits')).toBeTruthy()
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
    expect(screen.getByText('Events you create will show up here.')).toBeTruthy()
  })

  it('R3/R4: displays both empty-search states and an invalid-search message', () => {
    render(<App />)
    expect(screen.getByText('No events yet. Create your first event above!')).toBeTruthy()
    cleanup()

    seed([workshop()])
    render(<App />)
    searchOn(futureDate())
    fireEvent.change(screen.getByLabelText('Free from'), { target: { value: '17:00' } })
    fireEvent.change(screen.getByLabelText('Free until'), { target: { value: '18:00' } })
    expect(screen.getByText('No created events fit this date and time. Try a different window.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Free until'), { target: { value: '16:00' } })
    expect(screen.getByRole('alert').textContent).toContain('Please choose an end time later')
    expect(screen.getByText('Correct your available date or time to see matching events.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Free until'), { target: { value: '18:00' } })
    fireEvent.change(screen.getByLabelText('Free on date'), { target: { value: '' } })
    expect(screen.getByRole('alert').textContent).toContain('Please choose a valid date.')
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

  it('R1/R3: shows stored descriptions and human-readable dates and times', () => {
    const date = futureDate()
    seed([workshop({ title: 'Two Choirs', description: 'A cappella rehearsals', location: 'Music Hall', date })])
    render(<App />)
    searchOn(date)

    expect(screen.getAllByText('A cappella rehearsals')).toHaveLength(2) // search card + list
    const [year, month, day] = date.split('-')
    expect(screen.getAllByText(`${Number(month)}/${Number(day)}/${year}`)).toHaveLength(1)
    expect(screen.getByText('2:30pm – 3:30pm')).toBeTruthy()
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
    expect(screen.getByText('Events you create will show up here.')).toBeTruthy()
    expect(screen.getByText('0 total')).toBeTruthy()
  })
})
