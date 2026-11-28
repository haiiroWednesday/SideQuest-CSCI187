// @vitest-environment jsdom
// Discover and My Schedule read one source of busy time, say only real free time, and every
// change a student makes to plans or busy time reports itself in a toast with Undo.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/App'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'
import { PLANNED_IDS_KEY } from '../src/model/schedule'
import { presentSchedule } from '../src/controller/presentSchedule'
import { ToastStack } from '../src/view/Toasts'
import { useSharedSchedule } from '../src/view/useSharedSchedule'
import { renderHook } from '@testing-library/react'

// Friday 8 November 2030, 10:00 in Santa Clara.
const now = () => new Date('2030-11-08T10:00:00-08:00')
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const ev = (n: number, title: string, start: string, end: string, date = '2030-11-08'): CampusEvent =>
  ({ id: id(n), title, hostName: 'Club', description: 'x', location: 'Benson', date, start, end })
const ceramics = ev(1, 'Ceramics', '14:00', '15:00')
const choir = ev(2, 'Choir', '14:30', '15:30')
const film = ev(3, 'Film night', '18:00', '19:00')
const brunch = ev(4, 'Brunch', '09:00', '10:00', '2030-11-09')
const hike = ev(5, 'Hike', '16:00', '17:00', '2030-11-09')
const events = [ceramics, choir, film, brunch, hike]
const port = (): EventCatalogPort => ({
  create: vi.fn(), listUpcoming: vi.fn(async () => events), getById: vi.fn(async x => events.find(e => e.id === x) ?? null),
})
const planned = (...ids: string[]) => localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify(ids))
const go = async (hash: string) => { await act(async () => { location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')) }) }
const plannedIds = () => JSON.parse(localStorage.getItem(PLANNED_IDS_KEY) ?? '[]') as string[]

/** Types a busy time under "Edit busy times" (the "Mark busy" shortcut on free slips was cut on Nov 27). */
const busy3to6 = async () => {
  const edit = await screen.findByRole('button', { name: /Edit busy times/ })
  if (edit.getAttribute('aria-expanded') !== 'true') fireEvent.click(edit)
  const pick = (label: RegExp, hour: string) => {
    fireEvent.click(screen.getByRole('button', { name: label }))
    const pop = screen.getAllByRole('dialog').at(-1)!
    fireEvent.click(within(pop).getByRole('button', { name: hour }))
    fireEvent.click(within(pop).getByRole('button', { name: ':00' }))
  }
  pick(/^Busy from, /, '3pm'); pick(/^until, /, '6pm')
  fireEvent.click(screen.getByRole('button', { name: /^Add( another)?$/ }))
}

beforeEach(() => { localStorage.clear(); location.hash = '#discover' })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Discover: showing all events and clearing busy time are two different things', () => {
  it('turning "Fits my free time" off keeps busy time; "Clear busy time" says so and offers Undo', async () => {
    planned(ceramics.id, film.id)
    render(<App catalog={{ catalog: port(), shared: true }} quiet now={now} />)
    // Typed times and the list of busy times open from one line under the week, in My Schedule (Nov 28).
    await go('#schedule')
    await busy3to6()
    const editBusy = () => fireEvent.click(screen.getByRole('button', { name: /Edit busy times/ }))
    expect(screen.getByRole('button', { name: 'Free again 3–6pm' })).toBeTruthy()
    // The free-time filter is a chip beside the kinds on the Events step (C5, Nov 27).
    await go('#discover/events')
    fireEvent.click(screen.getByRole('button', { name: 'Fits my free time' }))
    await go('#schedule')
    editBusy()
    expect(screen.getByRole('button', { name: 'Free again 3–6pm' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear busy time' }))
    expect(screen.queryByRole('button', { name: 'Free again 3–6pm' })).toBeNull()
    const toast = screen.getByText('Busy time cleared.').closest('.sq-toast') as HTMLElement
    fireEvent.click(within(toast).getByRole('button', { name: 'Undo' }))
    if (!screen.queryByRole('button', { name: 'Free again 3–6pm' })) editBusy()
    expect(screen.getByRole('button', { name: 'Free again 3–6pm' })).toBeTruthy()
  })
})

describe('My Schedule reads the busy time marked on its own week', () => {
  it('shows it under its day and never offers "free" over it', async () => {
    planned(ceramics.id, film.id)
    render(<App catalog={{ catalog: port(), shared: true }} quiet now={now} />)
    await go('#schedule')
    expect(await screen.findByText('3 hr free →')).toBeTruthy()
    await busy3to6()
    expect(await screen.findByText('Busy 3–6pm')).toBeTruthy()
    expect(screen.queryByText(/hr free →/)).toBeNull()
  })

  it('"free" under a later day opens Discover on that day', async () => {
    planned(brunch.id, hike.id)
    render(<App catalog={{ catalog: port(), shared: true }} quiet now={now} />)
    await go('#schedule')
    // The timeline shows the day opened in the week (Nov 28): open Saturday there first.
    fireEvent.click(await screen.findByRole('button', { name: /^Sat\s*9/ }))
    const link = await screen.findByText('6 hr free →')
    expect(link.getAttribute('href')).toBe('#discover/2030-11-09')
    // Discover is the events list now: the link lands there, and the week keeps that day open in My Schedule.
    await go('#discover/2030-11-09')
    expect(await screen.findByRole('heading', { level: 1, name: /Events|What fits your free time/ })).toBeTruthy()
    await go('#schedule')
    expect(await screen.findByRole('button', { pressed: true, name: /^Sat\s*9/ })).toBeTruthy()
  })
})

describe('plan changes report themselves with Undo', () => {
  it('Remove names the plan and Undo brings it back', async () => {
    planned(ceramics.id, film.id)
    location.hash = '#schedule'
    render(<App catalog={{ catalog: port(), shared: true }} now={now} />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Remove Ceramics from plans' }))[0])
    const toast = (await screen.findByText('Removed “Ceramics” from My Schedule.')).closest('.sq-toast') as HTMLElement
    expect(plannedIds()).toEqual([film.id])
    await act(async () => { fireEvent.click(within(toast).getByRole('button', { name: 'Undo' })) })
    await waitFor(() => expect(plannedIds().sort()).toEqual([ceramics.id, film.id].sort()))
  })

  it('"Keep this one" names every plan removed in one toast, with Undo', async () => {
    planned(ceramics.id, choir.id)
    location.hash = '#schedule'
    render(<App catalog={{ catalog: port(), shared: true }} quiet now={now} />)
    fireEvent.click(await screen.findByRole('button', { name: /^1 clash/ }))
    // jsdom has no showModal, so the sheet's dialog stays closed to the accessibility tree.
    fireEvent.click(screen.getByRole('button', { name: /^Keep this one ?: Ceramics,/, hidden: true }))
    const toast = (await screen.findByText('Removed “Choir” from My Schedule.')).closest('.sq-toast') as HTMLElement
    expect(plannedIds()).toEqual([ceramics.id])
    await act(async () => { fireEvent.click(within(toast).getByRole('button', { name: 'Undo' })) })
    await waitFor(() => expect(plannedIds().sort()).toEqual([ceramics.id, choir.id].sort()))
  })

  it('a planned event can be removed from its open card on Discover', async () => {
    planned(film.id)
    render(<App catalog={{ catalog: port(), shared: true }} now={now} />)
    fireEvent.click(await screen.findByRole('button', { name: 'View details for Film night' }))
    const remove = await screen.findByRole('button', { name: 'Remove Film night from My Schedule' })
    await act(async () => { fireEvent.click(remove) })
    expect(await screen.findByText('Removed “Film night” from My Schedule.')).toBeTruthy()
    expect(plannedIds()).toEqual([])
  })

  it('Plan all says how many were added, and its Undo takes them all back', async () => {
    const catalog = port()
    const { result } = renderHook(() => useSharedSchedule(catalog))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.addMany([ceramics.id, film.id]) })
    expect(result.current.message).toBe('2 plans added.')
    expect(result.current.change).toMatchObject({ kind: 'added', ids: [ceramics.id, film.id] })
    await act(async () => { await result.current.removeMany(result.current.change!.ids) })
    expect(plannedIds()).toEqual([])
    expect(result.current.message).toBe('Removed “Ceramics” and “Film night” from My Schedule.')
  })

  it('a clash warning stays until closed', () => {
    render(<ToastStack toasts={[{ key: 'w', tone: 'warning', text: 'Schedule overlap', undo: () => {} }]} />)
    expect(document.querySelector('.sq-toast-timer')).toBeNull()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })
})

describe('clash count and overlap length', () => {
  const study = ev(6, 'Study Jam', '10:00', '12:00')
  const pottery = ev(7, 'Ceramics Workshop', '10:00', '11:00')
  const poetry = ev(8, 'Poetry Reading', '10:30', '11:30')
  const input = {
    ids: [study.id, pottery.id, poetry.id], missingIds: [],
    entries: [{ event: study, conflict: pottery }, { event: pottery, conflict: study }, { event: poetry, conflict: study }],
  }
  it('counts clashes, not plans', () => {
    const day = presentSchedule(input, new Date('2030-11-08T08:00:00-08:00')).days[0]
    expect(day.clashText).toBe('1 clash')
  })
  it('the card and the clash sheet say the same overlap for every plan', () => {
    const day = presentSchedule(input, new Date('2030-11-08T08:00:00-08:00')).days[0]
    const sheet = new Map(day.clashes[0].plans.map(p => [p.id, p.overlapText.replace(/ overlap$/, '')]))
    for (const stub of day.events) expect(stub.overlap?.text.endsWith(`by ${sheet.get(stub.id)}`)).toBe(true)
    expect(sheet.get(study.id)).toBe('1 hr 30 min')
  })
})

describe('the My Schedule tab and header', () => {
  it('badges clashes only, with a spoken label, and nothing when there are none', async () => {
    planned(ceramics.id, choir.id, film.id)
    render(<App catalog={{ catalog: port(), shared: true }} quiet now={now} />)
    const tab = await screen.findByRole('link', { name: 'My Schedule, 1 clash' })
    expect(tab.querySelector('.sq-badge-clash')?.textContent).toBe('1')
    cleanup()
    planned(ceramics.id, film.id)
    render(<App catalog={{ catalog: port(), shared: true }} quiet now={now} />)
    const plain = await screen.findByRole('link', { name: 'My Schedule' })
    await waitFor(() => expect(screen.getAllByText('Ceramics').length).toBeGreaterThan(0))
    expect(plain.querySelector('.sq-badge')).toBeNull()
  })
  it('My Schedule no longer shows a big "planned" count', async () => {
    planned(ceramics.id, film.id)
    location.hash = '#schedule'
    render(<App catalog={{ catalog: port(), shared: true }} quiet now={now} />)
    await screen.findByText('3 hr free →')
    expect(screen.queryByText('planned')).toBeNull()
  })
})
