// Real pieces end to end, no fixtures: Daven's EventCatalog (in-memory table)
// → Sembiyan's Schedule controller → the presenters the views draw.
import { describe, expect, it } from 'vitest'
import { createEventCatalog, type EventDraft } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { createScheduleController } from '../src/controller/personalSchedule'
import { presentDiscover, presentSchedule } from '../src/controller/presentScreens'
import { campusAt } from './helpers/campusTime'

const NOW = campusAt('2030-11-07', '09:00')
const draft = (over: Partial<EventDraft> = {}): EventDraft => ({
  title: 'Ceramics Workshop', hostName: 'SCU Ceramics Club', description: 'Clay provided.',
  location: 'Arts Building', date: '2030-11-07', start: '14:30', end: '15:30', ...over,
})
function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('catalog → schedule → screens', () => {
  it('posts, lists, plans, presents and removes with the team’s own controllers', async () => {
    const catalog = createEventCatalog(createInMemoryEventTable(), () => NOW)
    const a = await catalog.create(draft())
    const b = await catalog.create(draft({ title: 'Poetry Reading', start: '15:00', end: '16:00' }))
    const listed = await catalog.listUpcoming()

    const storage = memoryStorage()
    const plans = createScheduleController(listed, () => storage)
    plans.add(a.id)
    const added = plans.add(b.id)

    const discover = presentDiscover({ events: listed, plannedIds: added.schedule.ids, now: NOW })
    expect(discover.days[0].events.map(e => [e.title, e.host, e.planned])).toEqual([
      ['Ceramics Workshop', 'SCU Ceramics Club', true], ['Poetry Reading', 'SCU Ceramics Club', true],
    ])
    const schedule = presentSchedule(added.schedule, NOW)
    expect(schedule.nextUp?.stub.id).toBe(a.id)
    expect(schedule.days[0].overlapNote).toBe('2 plans overlap')

    // Removing a plan never deletes the public event.
    const removed = plans.remove(a.id)
    expect(presentSchedule(removed.schedule, NOW).plannedCount).toBe(1)
    expect((await catalog.listUpcoming()).map(e => e.id)).toContain(a.id)
  })

  // KNOWN BUG between two merged modules, recorded here rather than patched in
  // someone else's file: the catalog accepts descriptions up to 2000 characters
  // (CATALOG_LIMITS), but the Schedule controller resolves events with M1's
  // isCampusEvent, which rejects descriptions over 500. Planning such an event
  // fails. Flip `it.fails` to `it` once the limits agree.
  it.fails('lets a student plan an event whose description is 501 characters', async () => {
    const catalog = createEventCatalog(createInMemoryEventTable(), () => NOW)
    const long = await catalog.create(draft({ description: 'x'.repeat(501) }))
    const plans = createScheduleController(await catalog.listUpcoming(), () => memoryStorage())
    expect(plans.add(long.id).error).toBeNull()
  })
})
