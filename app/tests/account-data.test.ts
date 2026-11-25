// Signed-in My Schedule, Someday and busy time keep the device app's rules and save through
// the PersonalStorePort. A refused save is undone with a message; nothing is half-saved.
import { describe, expect, it, vi } from 'vitest'
import {
  createAccountBusyController, createAccountScheduleController, createAccountSomedayController,
  marksToRanges, planBusySync, rangesToMarks,
} from '../src/controller/accountData'
import { createServerPersonalStore } from '../src/controller/personalClient'
import { CELL, DAY_START } from '../src/controller/freeMarks'
import { PersonalStoreError, createMemoryPersonalTables } from '../src/model/personalData'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const E1 = '00000000-0000-4000-8000-000000000001'
const E2 = '00000000-0000-4000-8000-000000000002'
const ev = (id: string, start: string, end: string): CampusEvent => ({ id, title: `Event ${id.slice(-1)}`, description: 'x', hostName: 'Club', location: 'Benson', date: '2030-11-08', start, end })
const events = [ev(E1, '14:00', '15:00'), ev(E2, '14:30', '15:30')]
const catalog: EventCatalogPort = { create: vi.fn(), listUpcoming: async () => events, getById: async id => events.find(e => e.id === id) ?? null }

describe('signed-in My Schedule', () => {
  it('saves plans to the account with the same overlap warning, and another student sees none of them', async () => {
    const tables = createMemoryPersonalTables()
    const schedule = createAccountScheduleController(catalog, tables.forUser(A))
    expect((await schedule.read()).schedule.ids).toEqual([])
    await schedule.add(E1)
    const second = await schedule.add(E2)
    expect(second.warning).toMatch(/overlap/i)
    expect(await tables.forUser(A).listPlans()).toEqual([E1, E2])
    expect(await tables.forUser(B).listPlans()).toEqual([])
    const removed = await schedule.remove(E1)
    expect(removed.schedule.ids).toEqual([E2])
    expect(await tables.forUser(A).listPlans()).toEqual([E2])
  })
  it('undoes a plan the server refused and says why', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    store.addPlan = async () => { throw new PersonalStoreError('unavailable', 'SideQuest could not be reached. Your change was not saved.') }
    const schedule = createAccountScheduleController(catalog, store)
    const result = await schedule.add(E1)
    expect(result.schedule.ids).toEqual([])
    expect(result.error).toContain('not saved')
  })
  it('keeps a successful removal when a second queued removal fails', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    await store.addPlan(E1)
    await store.addPlan(E2)
    const remove = store.removePlan
    store.removePlan = async id => {
      if (id === E2) throw new PersonalStoreError('unavailable', 'Removal could not be saved.')
      await remove(id)
    }
    const schedule = createAccountScheduleController(catalog, store)
    await schedule.read()
    const [first, second] = await Promise.all([schedule.remove(E1), schedule.remove(E2)])
    expect(first.schedule.ids).toEqual([E2])
    expect(second.schedule.ids).toEqual([E2])
    expect(second.error).toContain('could not be saved')
    expect(await store.listPlans()).toEqual([E2])
  })

  it('loads plans another device saved', async () => {
    const tables = createMemoryPersonalTables()
    await tables.forUser(A).addPlan(E2)
    const result = await createAccountScheduleController(catalog, tables.forUser(A)).read()
    expect(result.schedule.entries.map(entry => entry.event.id)).toEqual([E2])
  })
})

describe('signed-in Someday', () => {
  it('shows a new idea at once, then swaps in the saved one', async () => {
    const tables = createMemoryPersonalTables()
    const someday = createAccountSomedayController(tables.forUser(A))
    await someday.load()
    const step = someday.add('  Night swim  ', '')
    expect(step.now.items[0].title).toBe('Night swim')
    expect(step.now.items[0].id).toMatch(/^pending-/)
    const saved = await step.saved!
    expect(saved.items[0].id).not.toMatch(/^pending-/)
    expect((await tables.forUser(A).listIdeas()).map(i => i.title)).toEqual(['Night swim'])
    const linked = await someday.link(saved.items[0].id, E1).saved!
    expect(linked.items[0]).toMatchObject({ status: 'ready', eventId: E1 })
  })
  it('rolls an idea back when the server refuses it, and blocks invalid ones before sending', async () => {
    const store = createMemoryPersonalTables().forUser(A)
    store.addIdea = async () => { throw new PersonalStoreError('limit', 'Your Someday list has reached its 100-idea limit.') }
    const someday = createAccountSomedayController(store)
    const step = someday.add('Kayak', '')
    expect((await step.saved!).items).toEqual([])
    expect((await step.saved!).error).toContain('100')
    expect(someday.add(' ', '').saved).toBeNull()
    expect(someday.setStatus('missing', 'ready').now.error).toBeTruthy()
  })
})

describe('signed-in busy time', () => {
  // Five-minute steps of the bar from 8am: cells('09:00', '10:30') is every step in that stretch.
  const step = (t: string) => { const [h, m] = t.split(':').map(Number); return (h * 60 + m - DAY_START) / CELL }
  const cells = (from: string, to: string) => Array.from({ length: step(to) - step(from) }, (_, i) => step(from) + i)
  it('turns marked steps into stretches and back', () => {
    const marks = { '2030-11-08': [...cells('09:00', '10:30'), ...cells('13:00', '13:30')] }
    expect(marksToRanges(marks)).toEqual([
      { date: '2030-11-08', start: '09:00', end: '10:30' },
      { date: '2030-11-08', start: '13:00', end: '13:30' },
    ])
    expect(rangesToMarks(marksToRanges(marks))).toEqual(marks)
  })
  it('keeps an imported 9:12 class as it is while the bar still covers it', () => {
    const rows = [{ id: 'c1', date: '2030-11-08', start: '09:12', end: '10:03', source: 'calendar' as const }]
    const marks = { '2030-11-08': cells('09:10', '11:00') }
    expect(planBusySync(rows, marks)).toEqual({ remove: [], add: [{ date: '2030-11-08', start: '10:05', end: '11:00', source: 'typed' }] })
    expect(planBusySync(rows, { '2030-11-08': cells('09:10', '09:40') }).remove).toEqual(rows)
  })
  it('saves a drag, a stretch and a clear to the account', async () => {
    const tables = createMemoryPersonalTables()
    const busy = createAccountBusyController(tables.forUser(A))
    expect((await busy.load()).marks).toEqual({})
    await busy.save({ '2030-11-08': cells('09:00', '10:00') })
    expect((await tables.forUser(A).listBusy()).map(r => `${r.start}-${r.end}`)).toEqual(['09:00-10:00'])
    await busy.save({ '2030-11-08': cells('09:00', '11:00') })
    expect((await tables.forUser(A).listBusy()).map(r => `${r.start}-${r.end}`)).toEqual(['09:00-11:00'])
    await busy.save({})
    expect(await tables.forUser(A).listBusy()).toEqual([])
    expect(await tables.forUser(B).listBusy()).toEqual([])
  })
})

describe('server adapter in the browser', () => {
  it('sends the tab\'s token to the same-origin API and maps refusals to messages', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      if (init.method === 'POST') return new Response(JSON.stringify({ error: 'Your schedule has reached the 100-event limit.' }), { status: 409 })
      return new Response(JSON.stringify({ plans: [E1] }), { status: 200 })
    }) as unknown as typeof fetch
    const store = createServerPersonalStore(async () => 'tab-memory-token-for-tests-only', fetchImpl)
    expect(await store.listPlans()).toEqual([E1])
    await expect(store.addPlan(E2)).rejects.toMatchObject({ kind: 'limit', message: expect.stringContaining('100') })
    expect(calls[0].url).toBe('/api/me/plans')
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe('Bearer tab-memory-token-for-tests-only')
    expect(calls[0].init.credentials).toBe('omit')
    const signedOut = createServerPersonalStore(async () => null, fetchImpl)
    await expect(signedOut.listPlans()).rejects.toMatchObject({ kind: 'signed-out' })
  })
})
