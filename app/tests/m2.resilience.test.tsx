// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import App from '../src/App'
import { loadPostedEvents, type EventCatalogPort } from '../src/controller/postEvent'
import { createSharedScheduleController, type SharedScheduleResult } from '../src/controller/sharedSchedule'
import { PLANNED_IDS_KEY } from '../src/model/schedule'
import { useSharedSchedule } from '../src/view/useSharedSchedule'
import { EmbeddedPostEventForm } from '../src/view/PostEventForm'
import type { CampusEvent } from '../src/model/eventCatalog'

const ID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const clock = () => new Date('2030-11-07T17:00:00Z')
const event: CampusEvent = { id: ID, title: 'Ceramics', description: 'Clay workshop', hostName: 'Art Club', location: 'Arts Building', date: '2030-11-08', start: '14:30', end: '15:30' }
const port = (): EventCatalogPort => ({ create: vi.fn(async draft => ({ id: ID, ...draft })), listUpcoming: vi.fn(async () => [event]), getById: vi.fn(async id => id === ID ? event : null) })
const deferred = <T,>() => { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
beforeEach(() => { localStorage.clear(); location.hash = '#discover' })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('catalog requests that never settle', () => {
  it('finishes a hung Discover read with retry feedback instead of loading forever', async () => {
    vi.useFakeTimers()
    const catalog = port(); catalog.listUpcoming = () => new Promise(() => {})
    let result: Awaited<ReturnType<typeof loadPostedEvents>> | undefined
    void loadPostedEvents(catalog).then(value => { result = value })
    await vi.advanceTimersByTimeAsync(10_001)
    expect(result).toBeDefined()
    expect(result?.error).toMatch(/too long|timed out/i)
    expect(result?.events).toEqual([])
  })
  it('keeps resolved plans while a timed-out ID stays retryable and never becomes missing', async () => {
    vi.useFakeTimers()
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID, OTHER]))
    const catalog = port(); catalog.getById = id => id === ID ? Promise.resolve(event) : new Promise(() => {})
    let result: SharedScheduleResult | undefined
    void createSharedScheduleController(catalog).read().then(value => { result = value })
    await vi.advanceTimersByTimeAsync(10_001)
    expect(result).toBeDefined()
    expect(result?.schedule.entries.map(e => e.event.id)).toEqual([ID])
    expect(result?.schedule.missingIds).toEqual([])
    expect(result?.unresolvedIds).toEqual([OTHER])
    expect(JSON.parse(localStorage.getItem(PLANNED_IDS_KEY)!)).toEqual([ID, OTHER])
  })
  it('a timed-out add never stores an ID or leaves the caller waiting forever', async () => {
    vi.useFakeTimers()
    const catalog = port(); catalog.getById = () => new Promise(() => {})
    let result: SharedScheduleResult | undefined
    void createSharedScheduleController(catalog).add(ID).then(value => { result = value })
    await vi.advanceTimersByTimeAsync(10_001)
    expect(result).toBeDefined()
    expect(result?.error).toContain('Could not load this event')
    expect(localStorage.getItem(PLANNED_IDS_KEY)).toBeNull()
  })
  it('a late response after a timeout cannot replace a successful Schedule retry', async () => {
    vi.useFakeTimers()
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID]))
    const first = deferred<CampusEvent | null>()
    const catalog = port()
    vi.mocked(catalog.getById).mockImplementationOnce(() => first.promise)
    const { result } = renderHook(() => useSharedSchedule(catalog))
    await act(async () => { await vi.advanceTimersByTimeAsync(10_001) })
    expect(result.current.loading).toBe(false)
    expect(result.current.unresolvedIds).toEqual([ID])
    await act(async () => { await result.current.refresh() })
    expect(result.current.schedule.entries[0].event.title).toBe('Ceramics')
    await act(async () => { first.resolve({ ...event, title: 'Stale title' }) })
    expect(result.current.schedule.entries[0].event.title).toBe('Ceramics')
  })
})

describe('production save failures and asynchronous actions', () => {
  it('does not claim a failed plan save succeeded, and leaves the catalog readable', async () => {
    render(<App catalog={{ catalog: port(), shared: true }} now={clock} />)
    const plan = await screen.findByRole('button', { name: '+ Plan to attend' })
    await waitFor(() => expect((plan as HTMLButtonElement).disabled).toBe(false))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota') })
    fireEvent.click(plan)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not save'))
    expect(screen.queryByText(/Added “/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'In My Schedule' })).toBeNull()
    expect(localStorage.getItem(PLANNED_IDS_KEY)).toBeNull()
    expect(screen.getByRole('button', { name: 'View details for Ceramics' })).toBeTruthy()
  })
  it('does not hide a plan or claim removal when its storage write fails', async () => {
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID])); location.hash = '#schedule'
    render(<App catalog={{ catalog: port(), shared: true }} now={clock} />)
    const remove = await screen.findAllByRole('button', { name: 'Remove Ceramics from plans' })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota') })
    fireEvent.click(remove[0])
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not save'))
    expect(screen.getAllByRole('button', { name: 'Remove Ceramics from plans' }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Removed from your plans/)).toBeNull()
    expect(JSON.parse(localStorage.getItem(PLANNED_IDS_KEY)!)).toEqual([ID])
  })
  it('a stale initial Schedule read cannot resurrect a removed plan', async () => {
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID]))
    const first = deferred<CampusEvent | null>(), catalog = port()
    vi.mocked(catalog.getById).mockImplementationOnce(() => first.promise)
    const { result } = renderHook(() => useSharedSchedule(catalog))
    await act(async () => { await result.current.remove(ID) })
    expect(result.current.schedule.ids).toEqual([])
    await act(async () => { first.resolve(event) })
    expect(result.current.schedule.ids).toEqual([])
    expect(result.current.message).toContain('Removed from your plans')
  })
  it('a mismatched event identity is an error, never a substitute for the saved ID', async () => {
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID]))
    const catalog = port(); catalog.getById = async () => ({ ...event, id: OTHER })
    const result = await createSharedScheduleController(catalog).read()
    expect(result.unresolvedIds).toEqual([ID])
    expect(result.schedule.entries).toEqual([])
    expect(result.schedule.missingIds).toEqual([])
    expect(result.schedule.ids).toEqual([ID])
  })
  it('prevents a second submit and freezes editable fields while posting', async () => {
    const pending = deferred<CampusEvent>(), catalog = port()
    vi.mocked(catalog.create).mockImplementationOnce(() => pending.promise)
    render(<EmbeddedPostEventForm connection={{ catalog, shared: true }} now={clock} />)
    for (const [name, value] of Object.entries({ 'EVENT NAME': 'Ceramics', 'HOST NAME': 'Art Club', DESCRIPTION: 'Clay workshop', LOCATION: 'Arts Building' })) fireEvent.change(screen.getByLabelText(name), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: '+ Post event' }))
    const posting = screen.getByRole('button', { name: 'Posting…' }) as HTMLButtonElement
    expect(posting.disabled).toBe(true)
    fireEvent.click(posting)
    expect(catalog.create).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText('EVENT NAME') as HTMLInputElement).disabled || (screen.getByLabelText('EVENT NAME') as HTMLInputElement).matches(':disabled')).toBe(true)
    await act(async () => { pending.resolve(event) })
    expect(catalog.create).toHaveBeenCalledTimes(1)
  })
})
