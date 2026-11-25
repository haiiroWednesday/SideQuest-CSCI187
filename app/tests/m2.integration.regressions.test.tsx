// @vitest-environment jsdom
// Integration regressions for the merged catalog + device Schedule contract.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../src/App'
import { createEventCatalog, toEventRow, type CampusEvent, type EventCatalogPort } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { PLANNED_IDS_KEY } from '../src/model/schedule'
import { createSharedScheduleController } from '../src/controller/sharedSchedule'
import { connectBrowserEventCatalog } from '../src/controller/postEvent'
import { PostEventForm } from '../src/view/PostEventForm'
import { useEventCatalog } from '../src/view/useEventCatalog'

const now = () => new Date('2030-11-07T09:00:00-08:00')
const ID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const event = (extra: Partial<CampusEvent> = {}): CampusEvent => ({
  id: ID, title: 'Ceramics', hostName: 'Art Club', description: 'x'.repeat(501),
  location: 'Arts Building', date: '2030-11-07', start: '14:30', end: '15:30', ...extra,
})
const port = (events = [event()]): EventCatalogPort => ({
  create: vi.fn(async draft => ({ id: ID, ...draft })),
  listUpcoming: vi.fn(async () => events),
  getById: vi.fn(async id => events.find(e => e.id === id) ?? null),
})
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
beforeEach(() => { localStorage.clear(); location.hash = '#discover' })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('shared Schedule resolution', () => {
  it.each([500, 501, 1000])('resolves and plans a valid %i-character description from a separate catalog client', async length => {
    const rows = new Map()
    const poster = createEventCatalog(createInMemoryEventTable(rows), now)
    const reader = createEventCatalog(createInMemoryEventTable(rows), now)
    const { id: _, ...draft } = event({ description: 'x'.repeat(length) })
    const created = await poster.create(draft)
    const schedule = createSharedScheduleController(reader)
    const added = await schedule.add(created.id)
    expect(added.error).toBeNull()
    expect(added.schedule.entries[0].event.description).toHaveLength(length)
    expect(JSON.parse(localStorage.getItem(PLANNED_IDS_KEY)!)).toEqual([created.id])
  })
  it('resolves and plans a stored 2000-character description that predates the 1000-character posting limit', async () => {
    const rows = new Map()
    const { id: _, ...draft } = event({ description: 'x'.repeat(2000) })
    const stored = await createInMemoryEventTable(rows).insert(toEventRow(draft))
    const schedule = createSharedScheduleController(createEventCatalog(createInMemoryEventTable(rows), now))
    const added = await schedule.add(stored.id)
    expect(added.error).toBeNull()
    expect(added.schedule.entries[0].event.description).toHaveLength(2000)
  })
  it('rejects a 1001-character description and past posts directly at the Model boundary', async () => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, now)
    const { id: _, ...draft } = event()
    await expect(catalog.create({ ...draft, description: 'x'.repeat(1001) })).rejects.toMatchObject({ kind: 'invalid' })
    await expect(catalog.create({ ...draft, date: '2030-11-06' })).rejects.toMatchObject({ kind: 'invalid' })
    await expect(catalog.create({ ...draft, start: '08:30', end: '10:00' })).rejects.toMatchObject({ kind: 'invalid' })
    expect(table.rows.size).toBe(0)
    await expect(catalog.create({ ...draft, start: '09:00', end: '10:00' })).resolves.toMatchObject({ start: '09:00' })
  })
  it('loads a past plan by ID while keeping a failed lookup distinct from a missing event', async () => {
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID, OTHER, 'gone']))
    const old = event({ date: '2029-11-07' })
    const catalog = port([old])
    catalog.getById = vi.fn(async id => { if (id === OTHER) throw Error('offline'); return id === ID ? old : null })
    const result = await createSharedScheduleController(catalog).read()
    expect(catalog.listUpcoming).not.toHaveBeenCalled()
    expect(result.schedule.entries[0].event).toEqual(old)
    expect(result.schedule.missingIds).toEqual(['gone'])
    expect(result.unresolvedIds).toEqual([OTHER])
    expect(result.lookupError).toContain('not changed')
    expect(JSON.parse(localStorage.getItem(PLANNED_IDS_KEY)!)).toEqual([ID, OTHER, 'gone'])
  })
  it('treats an invalid successful response as a lookup error and never discards the plan', async () => {
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID]))
    const catalog = port([event({ end: 'invalid' })])
    const result = await createSharedScheduleController(catalog).read()
    expect(result.unresolvedIds).toEqual([ID])
    expect(result.schedule.missingIds).toEqual([])
    expect(result.schedule.entries).toEqual([])
    expect(result.schedule.ids).toEqual([ID])
  })
  it('does not overwrite corrupt plans; explicit recovery retains valid IDs', async () => {
    const original = JSON.stringify([ID, 17, ID])
    localStorage.setItem(PLANNED_IDS_KEY, original)
    const schedule = createSharedScheduleController(port())
    expect((await schedule.add(OTHER)).schedule.blocked).toBe(true)
    expect(localStorage.getItem(PLANNED_IDS_KEY)).toBe(original)
    const recovered = await schedule.recover()
    expect(recovered.schedule.blocked).toBe(false)
    expect(recovered.schedule.ids).toEqual([ID])
    expect(recovered.schedule.entries[0].event.title).toBe('Ceramics')
  })
  it('preserves newer tab changes during a lookup and recognizes native storage events', async () => {
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID]))
    const pending = deferred<CampusEvent | null>()
    const catalog = port(); catalog.getById = vi.fn(() => pending.promise)
    const schedule = createSharedScheduleController(catalog)
    const reading = schedule.read()
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([OTHER]))
    pending.resolve(event())
    const result = await reading
    expect(result.schedule.ids).toEqual([OTHER])
    expect(result.schedule.missingIds).toEqual([])
    expect(result.unresolvedIds).toEqual([OTHER])
    expect(schedule.handlesStorageChange(new StorageEvent('storage', { key: PLANNED_IDS_KEY, storageArea: localStorage }))).toBe(true)
    expect(schedule.handlesStorageChange(new StorageEvent('storage', { key: 'other', storageArea: localStorage }))).toBe(false)
  })
  it('reports write failure, retains plans, and exposes capacity feedback', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => i === 0 ? ID : `saved-${i}`)
    const storage = { getItem: () => JSON.stringify(ids), setItem: vi.fn(() => { throw Error('quota') }) }
    const schedule = createSharedScheduleController(port([event(), event({ id: OTHER })]), () => storage)
    expect((await schedule.add(OTHER)).error).toContain('100-event limit')
    const removed = await schedule.remove(ID)
    expect(removed.error).toContain('could not save')
    expect(removed.schedule.ids).toEqual(ids)
    expect(removed.schedule.capacityMessage).toContain('100-event limit')
  })
})

describe('production wiring and request order', () => {
  it('after planning, the toast offers a link to My Schedule without leaving Discover', async () => {
    render(<App catalog={{ catalog: port(), shared: true }} now={now} />)
    await screen.findByRole('button', { name: 'View details for Ceramics' })
    fireEvent.click(screen.getByRole('button', { name: '+ Plan to attend' }))
    const link = await screen.findByRole('link', { name: 'See My Schedule' })
    expect(link.getAttribute('href')).toBe('#schedule')
    expect(location.hash).toBe('#discover')
    expect(screen.getByRole('status').textContent).toContain('Added “Ceramics” to My Schedule.')
  })
  it('loads shared events when the localStorage getter throws, and plans in memory for the visit', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw Error('blocked') })
    // Catalog selection itself must not touch localStorage, even with Supabase configured.
    expect(connectBrowserEventCatalog({ shared: true }).shared).toBe(true)
    render(<App catalog={{ catalog: port(), shared: true }} now={now} />)
    expect(await screen.findByRole('button', { name: 'View details for Ceramics' })).toBeTruthy()
    // Owner decision (Nov 25): a blocked browser keeps plans in memory and says so in one line.
    await waitFor(() => expect((screen.getByRole('button', { name: '+ Plan to attend' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByText("This browser won't save your plans.")).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Recover valid plans' })).toBeNull()
  })
  it('updates the production Schedule on a storage event without reloading the page', async () => {
    render(<App catalog={{ catalog: port(), shared: true }} now={now} />)
    await screen.findByRole('button', { name: 'View details for Ceramics' })
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify([ID]))
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: PLANNED_IDS_KEY, storageArea: localStorage })) })
    // The whole App re-renders on the storage event; waitFor's 1 s default and the 5 s test limit
    // were both too tight on a loaded CI machine.
    await waitFor(() => expect(screen.getByRole('button', { name: 'In My Schedule' })).toBeTruthy(), { timeout: 5_000 })
  }, 15_000)
  it('an older Discover request cannot overwrite a successful post refresh', async () => {
    const first = deferred<CampusEvent[]>()
    const catalog = port()
    vi.mocked(catalog.listUpcoming).mockImplementationOnce(() => first.promise)
    function Harness() {
      const state = useEventCatalog(catalog)
      return <><button onClick={() => { void state.refresh() }}>Refresh after posting</button><p>{state.events.map(e => e.title).join(',')}</p></>
    }
    render(<Harness />)
    fireEvent.click(screen.getByText('Refresh after posting'))
    await screen.findByText('Ceramics')
    await act(async () => { first.resolve([]) })
    expect(screen.getByText('Ceramics')).toBeTruthy()
  })
  it('the standalone posting list also ignores its stale initial response', async () => {
    const first = deferred<CampusEvent[]>()
    const catalog = port()
    vi.mocked(catalog.listUpcoming).mockImplementationOnce(() => first.promise)
    render(<PostEventForm connection={{ catalog, shared: true }} now={now} />)
    for (const [label, value] of Object.entries({ 'EVENT NAME': 'Ceramics', 'HOST NAME': 'Art Club', DESCRIPTION: 'Description', LOCATION: 'Arts Building' })) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: '+ Post event' }))
    await screen.findByText('Ceramics')
    await act(async () => { first.resolve([]) })
    expect(screen.getByText('Ceramics')).toBeTruthy()
  })
})
