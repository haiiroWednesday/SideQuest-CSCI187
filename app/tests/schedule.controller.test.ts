// Sembiyan: user actions travel through the Controller and preserve the catalog.
import { describe, expect, it } from 'vitest'
import { createScheduleController, loadPlannedEvents } from '../src/controller/personalSchedule'
import type { EventCatalogPort } from '../src/model/eventCatalog'
import { PLANNED_IDS_KEY, type PlanStorage } from '../src/model/schedule'
import { STORAGE_KEY, type CampusEvent } from '../src/model/events'

const catalog: CampusEvent[] = [
  { id: 'a', title: 'Workshop', location: 'SCU', date: '2030-11-01', start: '10:00', end: '11:00' },
  { id: 'b', title: 'Choir', location: 'SCU', date: '2030-11-01', start: '10:30', end: '11:30' },
  { id: 'c', title: 'Workshop', location: 'SCU', date: '2030-11-01', start: '11:30', end: '12:30' },
]
function setup(raw?: string) {
  const data = new Map<string, string>([[STORAGE_KEY, JSON.stringify(catalog)]])
  if (raw !== undefined) data.set(PLANNED_IDS_KEY, raw)
  const storage: PlanStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value) } }
  return { data, storage, controller: createScheduleController(catalog, () => storage) }
}

it('resolves valid long M2 descriptions from the catalog instead of reporting unavailable', async () => {
  const full = { ...catalog[0], hostName: 'SCU club', description: 'D'.repeat(2000) }
  const api: EventCatalogPort = {
    create: async () => { throw Error('read-only test') },
    listUpcoming: async () => [full],
    getById: async id => id === 'a' ? full : null,
  }
  const found = await loadPlannedEvents(api, ['a', 'missing'])
  expect(found.events).toEqual([full])
  expect(found.missingIds).toEqual(['missing'])
  expect(found.failedIds).toEqual([])
})

describe('personal Schedule Controller', () => {
  it('adds, reloads and removes plans without changing original events', () => {
    const { controller, data, storage } = setup()
    expect(controller.read().schedule.entries).toEqual([])
    expect(controller.add('a').message).toContain('Added')
    expect(createScheduleController(catalog, () => storage).read().schedule.entries[0].event.id).toBe('a')
    expect(controller.remove('a').message).toContain('original event has not been deleted')
    expect(data.get(PLANNED_IDS_KEY)).toBe('[]')
    expect(data.get(STORAGE_KEY)).toBe(JSON.stringify(catalog))
    expect(catalog).toHaveLength(3)
  })
  it('allows overlapping plans, warns by event name, and clears the conflict after removal', () => {
    const { controller } = setup()
    controller.add('a')
    const result = controller.add('b')
    expect(result.error).toBeNull()
    expect(result.warning).toContain('Workshop')
    expect(result.warning).toContain('Choir')
    expect(result.schedule.entries.every(entry => entry.conflict !== null)).toBe(true)
    expect(controller.remove('b').schedule.entries[0].conflict).toBeNull()
  })
  it('allows back-to-back plans without a warning', () => {
    const { controller } = setup('["b"]')
    expect(controller.add('c').warning).toBeNull()
  })
  it('does not duplicate a plan, but distinguishes same-title events by ID', () => {
    const { controller, data } = setup()
    controller.add('a')
    expect(controller.add('a').message).toContain('already')
    controller.add('c')
    expect(JSON.parse(data.get(PLANNED_IDS_KEY)!)).toEqual(['a', 'c'])
  })
  it('reads the latest plans on each action instead of overwriting an unseen tab update', () => {
    const { controller, data } = setup()
    controller.read()
    data.set(PLANNED_IDS_KEY, '["b"]')
    controller.add('a')
    expect(JSON.parse(data.get(PLANNED_IDS_KEY)!)).toEqual(['b', 'a'])
    data.set(PLANNED_IDS_KEY, '["a","b","c"]')
    controller.remove('a')
    expect(JSON.parse(data.get(PLANNED_IDS_KEY)!)).toEqual(['b', 'c'])
  })
  it('keeps unavailable IDs visible/removable and rejects adding a nonexistent event', () => {
    const { controller, data } = setup('["missing"]')
    expect(controller.read().schedule.missingIds).toEqual(['missing'])
    expect(controller.add('missing').error).toContain('unavailable')
    expect(controller.remove('missing').schedule.ids).toEqual([])
    expect(data.get(STORAGE_KEY)).toBe(JSON.stringify(catalog))
  })
  it('does not overwrite corrupted plans during a read, add or remove; recovery is a separate action', () => {
    const { controller, data } = setup('["a",null]')
    expect(controller.read().schedule.blocked).toBe(true)
    expect(controller.add('b').error).not.toBeNull()
    expect(controller.remove('a').error).not.toBeNull()
    expect(data.get(PLANNED_IDS_KEY)).toBe('["a",null]')
    expect(controller.recover().schedule.blocked).toBe(false)
    expect(data.get(PLANNED_IDS_KEY)).toBe('["a"]')
  })
  it('reports quota failure honestly and retains previous plans on add and remove', () => {
    const { storage, data } = setup('["a"]')
    storage.setItem = () => { throw new DOMException('full', 'QuotaExceededError') }
    const controller = createScheduleController(catalog, () => storage)
    for (const result of [controller.add('b'), controller.remove('a')]) {
      expect(result.error).toContain('could not save')
      expect(result.message).toBeNull()
      expect(result.schedule.ids).toEqual(['a'])
    }
    expect(data.get(PLANNED_IDS_KEY)).toBe('["a"]')
  })
  it('handles access denied even while acquiring the browser storage object', () => {
    const controller = createScheduleController(catalog, () => { throw Error('denied') })
    expect(controller.read().schedule.blocked).toBe(true)
    expect(controller.add('a').error).not.toBeNull()
    expect(controller.remove('a').error).not.toBeNull()
  })
})

it('reports the limit at 100, rejects extra saves without writes, and allows adding after removal', () => {
  const fullCatalog = Array.from({ length: 100 }, (_, index) => ({ ...catalog[0], id: `plan-${index}` }))
  const initialIds = fullCatalog.slice(0, 99).map(event => event.id)
  const { data, storage } = setup(JSON.stringify(initialIds))
  const controller = createScheduleController([...fullCatalog, catalog[1]], () => storage)
  const hundredth = controller.add('plan-99')
  expect(hundredth.schedule.ids).toHaveLength(100)
  expect(hundredth.schedule.capacityMessage).toContain('100-event limit')
  const saved = data.get(PLANNED_IDS_KEY)
  expect(controller.add('plan-99').error).toBeNull()
  expect(controller.add('b').error).toContain('100-event limit')
  expect(data.get(PLANNED_IDS_KEY)).toBe(saved)
  expect(controller.remove('plan-0').schedule.capacityMessage).toBeNull()
  expect(controller.add('b').schedule.ids).toHaveLength(100)
  expect(data.get(STORAGE_KEY)).toBe(JSON.stringify(catalog))
})
