// Resolve local plan identities through the agreed async port, including past events.
import { readCatalogWithDeadline } from './catalogReads'
import { createScheduleController, type ScheduleResult } from './personalSchedule'
import { browserStorage } from './postEvent'
import { deviceStorage } from '../model/deviceStorage'
import { isCatalogEvent, type EventCatalogPort } from '../model/eventCatalog'
import { PLANNED_IDS_KEY, type PlanStorage, type ScheduleEvent } from '../model/schedule'

export type SharedScheduleResult = ScheduleResult & {
  loading: boolean
  unresolvedIds: string[]
  lookupError: string | null
}

export function createSharedScheduleController(
  catalog: EventCatalogPort,
  getStorage: () => PlanStorage = browserStorage,
) {
  const core = (events: readonly ScheduleEvent[] = []) => createScheduleController(events, getStorage)
  const decorate = (result: ScheduleResult): SharedScheduleResult => ({
    ...result, loading: false, unresolvedIds: [], lookupError: null,
  })

  async function resolve() {
    const snapshot = core().read()
    if (snapshot.schedule.blocked) {
      return { events: [] as ScheduleEvent[], result: decorate({ ...snapshot, schedule: { ...snapshot.schedule, missingIds: [] } }) }
    }
    const resolved = await Promise.allSettled(snapshot.schedule.ids.map(id => readCatalogWithDeadline(() => catalog.getById(id))))
    const events: ScheduleEvent[] = []
    const missing = new Set<string>()
    const failed = new Set<string>()
    resolved.forEach((outcome, index) => {
      const id = snapshot.schedule.ids[index]
      if (outcome.status === 'rejected') failed.add(id)
      else if (outcome.value === null) missing.add(id)
      else if (!isCatalogEvent(outcome.value) || outcome.value.id !== id) failed.add(id)
      else events.push(outcome.value)
    })
    const latest = core(events).read()
    // Another tab can add a plan while lookups are in flight. Until fetched,
    // its details are unresolved, never falsely classified as deleted.
    const lookedUp = new Set(snapshot.schedule.ids)
    const unresolvedIds = latest.schedule.ids.filter(id => failed.has(id) || !lookedUp.has(id))
    const result: SharedScheduleResult = {
      ...latest,
      schedule: { ...latest.schedule, missingIds: latest.schedule.ids.filter(id => missing.has(id)) },
      loading: false,
      unresolvedIds,
      lookupError: unresolvedIds.length ? 'Some planned event details could not be loaded. Your saved plans have not changed. Try again.' : null,
    }
    return { events, result }
  }

  async function finish(action: ScheduleResult): Promise<SharedScheduleResult> {
    const { result } = await resolve()
    return { ...result, error: action.error ?? result.error, message: action.message, warning: action.warning }
  }

  return {
    initial(): SharedScheduleResult {
      const state = decorate(core().read())
      return { ...state, loading: !state.schedule.blocked, schedule: { ...state.schedule, missingIds: [] } }
    },
    async read() { return (await resolve()).result },
    async add(id: string): Promise<SharedScheduleResult> {
      const { events, result } = await resolve()
      if (result.schedule.blocked) return result
      try {
        const event = await readCatalogWithDeadline(() => catalog.getById(id))
        if (!event) return { ...result, error: 'This event is unavailable. Refresh the event list before adding it.' }
        if (!isCatalogEvent(event) || event.id !== id) return { ...result, error: 'Could not load this event. Your saved plans have not changed. Try again.' }
        return finish(core([...events.filter(item => item.id !== id), event]).add(id))
      } catch {
        return { ...result, error: 'Could not load this event. Your saved plans have not changed. Try again.' }
      }
    },
    async remove(id: string) { return finish(core().remove(id)) },
    async recover() { return finish(core().recover()) },
    handlesStorageChange(event: StorageEvent) {
      try {
        const storage = getStorage === browserStorage ? deviceStorage() : getStorage()
        return event.storageArea === storage && (event.key === null || event.key === PLANNED_IDS_KEY)
      } catch { return false }
    },
  }
}
