// @vitest-environment jsdom
// Saves to the account settle out of order. A refused save takes back only its own change, the
// newest edit always wins, the server and the screen agree after a later success, and nothing
// that settles after sign-out writes into the signed-out page.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createAccountBusyController, createAccountSomedayController } from '../src/controller/accountData'
import { CELL, DAY_START, undoChange, type FreeMarks } from '../src/controller/freeMarks'
import { PersonalStoreError, createMemoryPersonalTables, type BusyDraft, type BusyRange, type PersonalStorePort } from '../src/model/personalData'
import type { Intention } from '../src/model/someday'
import { useBusyMarks } from '../src/view/useBusyMarks'
import { useSomeday } from '../src/view/useSomeday'

const A = '11111111-1111-4111-8111-111111111111'
const DAY = '2030-11-08'
const step = (t: string) => { const [h, m] = t.split(':').map(Number); return (h * 60 + m - DAY_START) / CELL }
const cells = (from: string, to: string) => Array.from({ length: step(to) - step(from) }, (_, i) => step(from) + i)
const refused = () => new PersonalStoreError('unavailable', 'SideQuest could not be reached. Your change was not saved.')
function deferred<T>() { let resolve!: (v: T) => void, reject!: (e: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const stretches = async (store: PersonalStorePort) => (await store.listBusy()).map(r => `${r.start}-${r.end}`).sort()

afterEach(() => cleanup())

describe('busy time: a failed save never wipes a newer edit', () => {
  it('undoes only the refused change, keeps the newer one, and the server ends up matching the bar', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    const add = store.addBusy.bind(store)
    const second = deferred<void>()
    let calls = 0
    store.addBusy = async (draft: BusyDraft): Promise<BusyRange> => {
      calls++
      if (draft.start === '09:00') throw refused()
      await second.promise
      return add(draft)
    }
    const { result } = renderHook(() => useBusyMarks(store))
    await waitFor(() => expect(result.current.marks).toEqual({}))
    const first: FreeMarks = { [DAY]: cells('09:00', '10:00') }
    const newer: FreeMarks = { [DAY]: [...cells('09:00', '10:00'), ...cells('13:00', '14:00')] }
    act(() => { result.current.setMarks(first) })
    act(() => { result.current.setMarks(newer) })
    // The 9am save is refused. The 1pm stretch, drawn after it, stays on the bar.
    await waitFor(() => expect(result.current.error).toContain('not saved'))
    expect(result.current.marks).toEqual({ [DAY]: cells('13:00', '14:00') })
    await act(async () => { second.resolve() })
    await waitFor(() => expect(calls).toBeGreaterThan(1))
    await waitFor(async () => expect(await stretches(store)).toEqual(['13:00-14:00']))
    expect(result.current.marks).toEqual({ [DAY]: cells('13:00', '14:00') })
  })

  it('applies only the newest result when two saves succeed out of step', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    const busy = createAccountBusyController(store)
    await busy.load()
    const one = busy.save({ [DAY]: cells('09:00', '10:00') })
    const two = busy.save({ [DAY]: cells('11:00', '12:00') })
    const [older, newest] = await Promise.all([one, two])
    expect(older.stale).toBe(true)
    expect(newest.stale).toBe(false)
    expect(newest.marks).toEqual({ [DAY]: cells('11:00', '12:00') })
    expect(await stretches(store)).toEqual(['11:00-12:00'])
  })

  it('undoChange leaves steps changed since alone', () => {
    const before = { [DAY]: [1, 2] }, after = { [DAY]: [1, 2, 3, 4] }, current = { [DAY]: [1, 2, 3, 4, 9] }
    expect(undoChange(current, before, after)).toEqual({ [DAY]: [1, 2, 9] })
    expect(undoChange({ [DAY]: [9] }, { [DAY]: [5] }, {})).toEqual({ [DAY]: [5, 9] })
  })
})

describe('signing out while a save is on the way', () => {
  it('busy time: a save that settles after sign-out writes nothing into the signed-out page', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    const gate = deferred<void>()
    store.addBusy = async () => { await gate.promise; throw refused() }
    const { result, rerender } = renderHook(({ s }: { s: PersonalStorePort | null }) => useBusyMarks(s), { initialProps: { s: store as PersonalStorePort | null } })
    await waitFor(() => expect(result.current.marks).toEqual({}))
    act(() => { result.current.setMarks({ [DAY]: cells('09:00', '10:00') }) })
    rerender({ s: null })
    act(() => { result.current.setMarks({ [DAY]: cells('15:00', '16:00') }) })
    await act(async () => { gate.resolve(); await new Promise(r => setTimeout(r, 0)) })
    expect(result.current.error).toBeNull()
    expect(result.current.marks).toEqual({ [DAY]: cells('15:00', '16:00') })
  })

  it('Someday: an idea saved after sign-out never appears in the device list', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    const gate = deferred<void>()
    const addIdea = store.addIdea.bind(store)
    store.addIdea = async draft => { await gate.promise; return addIdea(draft) }
    const { result, rerender } = renderHook(({ s }: { s: PersonalStorePort | null }) => useSomeday(s), { initialProps: { s: store as PersonalStorePort | null } })
    await waitFor(() => expect(result.current.items).toEqual([]))
    act(() => { result.current.add('Account idea', '') })
    rerender({ s: null })
    await act(async () => { gate.resolve(); await new Promise(r => setTimeout(r, 0)) })
    expect(result.current.items.map(i => i.title)).not.toContain('Account idea')
  })
})

describe('Someday: a refused edit puts back only its own idea', () => {
  async function twoIdeas() {
    const store = createMemoryPersonalTables().forUser(A)
    const x = await store.addIdea({ title: 'Kayak', note: '', source: 'typed' })
    const y = await store.addIdea({ title: 'Night swim', note: '', source: 'typed' })
    const someday = createAccountSomedayController(store)
    await someday.load()
    return { store, someday, x, y }
  }
  const statusOf = (items: Intention[], id: string) => items.find(i => i.id === id)?.status

  it('a later edit to another idea survives an earlier refused one', async () => {
    const { store, someday, x, y } = await twoIdeas()
    const update = store.updateIdea.bind(store)
    const gate = deferred<void>()
    store.updateIdea = async (id, patch) => { if (id === x.id) { await gate.promise; throw refused() } return update(id, patch) }
    const first = someday.setStatus(x.id, 'deferred')
    const later = someday.setStatus(y.id, 'completed')
    await later.saved
    gate.resolve()
    const settled = await first.saved!
    expect(settled.error).toContain('not saved')
    expect(statusOf(settled.items, x.id)).toBe('saved')
    expect(statusOf(settled.items, y.id)).toBe('completed')
  })

  it('an older refused edit to the same idea does not undo a newer one', async () => {
    const { store, someday, x } = await twoIdeas()
    const update = store.updateIdea.bind(store)
    const gate = deferred<void>()
    let n = 0
    store.updateIdea = async (id, patch) => { if (++n === 1) { await gate.promise; throw refused() } return update(id, patch) }
    const first = someday.setStatus(x.id, 'deferred')
    const second = someday.setStatus(x.id, 'completed')
    await second.saved
    gate.resolve()
    const settled = await first.saved!
    expect(statusOf(settled.items, x.id)).toBe('completed')
    expect((await store.listIdeas()).find(i => i.id === x.id)?.status).toBe('completed')
  })
})
