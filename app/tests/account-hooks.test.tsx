// @vitest-environment jsdom
// Signed in, the app's hooks keep plans, ideas and busy time in the account and leave this
// browser's storage alone. Signed out, they behave exactly as before.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import App from '../src/App'
import { useSharedSchedule } from '../src/view/useSharedSchedule'
import { useSomeday } from '../src/view/useSomeday'
import { useBusyMarks } from '../src/view/useBusyMarks'
import { createMemoryPersonalTables } from '../src/model/personalData'
import { PLANNED_IDS_KEY } from '../src/model/schedule'
import { SOMEDAY_KEY } from '../src/model/someday'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'

const A = '11111111-1111-4111-8111-111111111111'
const E1 = '00000000-0000-4000-8000-000000000001'
const event: CampusEvent = { id: E1, title: 'Ceramics', description: 'Clay', hostName: 'Art Club', location: 'Dowd', date: '2030-11-08', start: '14:00', end: '15:00' }
const catalog: EventCatalogPort = { create: vi.fn(), listUpcoming: async () => [event], getById: async id => id === E1 ? event : null }

beforeEach(() => { localStorage.clear(); location.hash = '#discover' })
afterEach(() => { cleanup() })

describe('hooks with an account', () => {
  it('My Schedule saves to the account and not to this browser', async () => {
    const tables = createMemoryPersonalTables()
    const store = tables.forUser(A)
    const { result } = renderHook(() => useSharedSchedule(catalog, store))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.add(E1) })
    expect(result.current.schedule.ids).toEqual([E1])
    expect(await store.listPlans()).toEqual([E1])
    expect(localStorage.getItem(PLANNED_IDS_KEY)).toBeNull()
  })
  it('Someday saves to the account and not to this browser', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    const { result } = renderHook(() => useSomeday(store))
    let accepted = false
    act(() => { accepted = result.current.add('Sunrise hike', '') })
    expect(accepted).toBe(true)
    expect(result.current.items[0].title).toBe('Sunrise hike')
    await waitFor(async () => expect((await store.listIdeas()).map(i => i.title)).toEqual(['Sunrise hike']))
    await waitFor(() => expect(result.current.items[0].id).not.toMatch(/^pending-/))
    expect(localStorage.getItem(SOMEDAY_KEY)).toBeNull()
  })
  it('busy marks load from the account and save back', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    await store.addBusy({ date: '2030-11-08', start: '09:00', end: '10:00', source: 'typed' })
    const { result } = renderHook(() => useBusyMarks(store))
    await waitFor(() => expect(result.current.marks).toEqual({ '2030-11-08': Array.from({ length: 12 }, (_, i) => 12 + i) }))
    act(() => { result.current.setMarks({}) })
    await waitFor(async () => expect(await store.listBusy()).toEqual([]))
  })
  it('without an account, plans stay on this device as before', async () => {
    const { result } = renderHook(() => useSharedSchedule(catalog))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.add(E1) })
    expect(JSON.parse(localStorage.getItem(PLANNED_IDS_KEY) ?? '[]')).toEqual([E1])
  })
})

describe('the app signed in', () => {
  it('says things are saved to the account, offers sign out, and shows no sample groups', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    const signOut = vi.fn()
    render(<App catalog={{ catalog, shared: true }} quiet signedIn personalStore={store}
      emailAuth={{ enabled: true, busy: false, error: null, message: null, accounts: true, requestCode: async () => true, verifyCode: async () => true, signOut }} />)
    await screen.findAllByText('Ceramics')
    expect(document.body.textContent).toContain('saved to your account')
    expect(document.querySelector('a[href="#groups"]')).toBeNull()
    expect(document.querySelector('a[href="#login"]')).toBeNull()
  })
  it('signed out with sign-in available, offers the sign-in page', async () => {
    render(<App catalog={{ catalog, shared: true }}
      emailAuth={{ enabled: true, busy: false, error: null, message: null, accounts: true, requestCode: async () => true, verifyCode: async () => true, signOut: () => {} }} />)
    await screen.findAllByText('Ceramics')
    expect(document.querySelector('a[href="#login"]')).not.toBeNull()
  })
})
