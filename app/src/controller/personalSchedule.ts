// CONTROLLER: the View requests every plan read/change here, never in the Model.
import { readCatalogWithDeadline } from './catalogReads'
import type { CampusEvent } from '../model/events'
import type { EventCatalogPort } from '../model/eventCatalog'
import {
  addPlannedId, readPlannedIds, removePlannedId, resolvePlannedEvents,
  savePlannedIds, scheduleConflicts, PLANNED_IDS_KEY,
  MAX_PLANNED_EVENTS, SCHEDULE_LIMIT_MESSAGE, isScheduleEvent,
  type PlannedIdsState, type PlanStorage,
} from '../model/schedule'

export type ScheduleView = {
  ids: string[]
  entries: { event: CampusEvent; conflict: CampusEvent | null }[]
  missingIds: string[]
  blocked: boolean
  capacityMessage: string | null
}
export type ScheduleResult = {
  schedule: ScheduleView
  error: string | null
  message: string | null
  warning: string | null
}

// Look up saved IDs even when events no longer appear in the upcoming list.
// A failed request is not evidence that the event was removed.
export async function loadPlannedEvents(catalog: EventCatalogPort, ids: readonly string[]) {
  const lookups = await Promise.all(ids.map(async id => {
    try {
      const event = await readCatalogWithDeadline(() => catalog.getById(id))
      if (event !== null && (!isScheduleEvent(event) || event.id !== id)) {
        return { id, event: null, failed: true }
      }
      return { id, event, failed: false }
    }
    catch { return { id, event: null, failed: true } }
  }))
  return {
    events: lookups.flatMap(({ event }) => event ? [event] : []),
    missingIds: lookups.filter(({ event, failed }) => !event && !failed).map(({ id }) => id),
    failedIds: lookups.filter(({ failed }) => failed).map(({ id }) => id),
  }
}

// Plan writes stay synchronous and local. This snapshot is only used to
// present details and check overlaps; no event objects are persisted in plans.
export function createScheduleController(
  catalog: readonly CampusEvent[],
  getStorage: () => PlanStorage = () => window.localStorage,
) {
  function present(state: PlannedIdsState): ScheduleView {
    const { events, missingIds } = resolvePlannedEvents(state.ids, catalog)
    const conflicts = scheduleConflicts(events)
    return {
      ...state, missingIds,
      capacityMessage: state.ids.length >= MAX_PLANNED_EVENTS ? SCHEDULE_LIMIT_MESSAGE : null,
      entries: events.map(event => ({ event, conflict: conflicts.get(event.id) ?? null })),
    }
  }
  // Named action feedback prevents positional mistakes between messages and warnings.
  function result(state: PlannedIdsState, feedback: Partial<Pick<ScheduleResult, 'error' | 'message' | 'warning'>> = {}): ScheduleResult {
    return { schedule: present(state), error: feedback.error ?? null, message: feedback.message ?? null, warning: feedback.warning ?? null }
  }
  function current(): { state: PlannedIdsState; storage: PlanStorage | null } {
    try {
      const storage = getStorage()
      return { state: readPlannedIds(storage), storage }
    } catch {
      return { state: { ids: [], blocked: true }, storage: null }
    }
  }
  const readError = 'Some saved plans could not be read. They have not been overwritten.'
  const writeError = 'Your browser could not save this schedule change. Your saved plans have not changed. Free browser storage or allow storage, then try again.'
  return {
    present,
    read(): ScheduleResult {
      const { state } = current()
      return result(state, { error: state.blocked ? readError : null })
    },
    add(id: string): ScheduleResult {
      // Read on each action so another tab's latest plans are retained.
      // localStorage read/modify/write is best effort, not a transaction.
      const { state, storage } = current()
      if (state.blocked || !storage) return result(state, { error: readError })
      const event = catalog.find(item => item.id === id && isScheduleEvent(item))
      if (!event) return result(state, { error: 'This event is unavailable. Refresh the event list before adding it.' })
      const next = addPlannedId(state.ids, id)
      if (next.error) return result(state, { error: next.error })
      if (!next.added) return result(state, { message: 'This event is already in your plans.' })
      if (!savePlannedIds(storage, next.ids)) return result(state, { error: writeError })
      const updated = { ids: next.ids, blocked: false }
      const conflict = present(updated).entries.find(entry => entry.event.id === id)?.conflict
      return result(updated, {
        message: `Added “${event.title}” to your plans.`,
        warning: conflict ? `Schedule overlap: “${event.title}” overlaps “${conflict.title}”. Both remain in your plans; review their times.` : null,
      })
    },
    remove(id: string): ScheduleResult {
      const { state, storage } = current()
      if (state.blocked || !storage) return result(state, { error: readError })
      if (!state.ids.includes(id)) return result(state, { message: 'This event is no longer in your plans.' })
      const ids = removePlannedId(state.ids, id)
      if (!savePlannedIds(storage, ids)) return result(state, { error: writeError })
      return result({ ids, blocked: false }, { message: 'Removed from your plans. The original event has not been deleted.' })
    },
    // Only called after the View obtains explicit recovery confirmation.
    recover(): ScheduleResult {
      const { state, storage } = current()
      if (!storage || !savePlannedIds(storage, state.ids)) return result(state, { error: writeError })
      return result({ ids: state.ids, blocked: false }, { message: 'Valid plans recovered.' })
    },
    handlesStorageChange(event: StorageEvent): boolean {
      try {
        return event.storageArea === getStorage() && (event.key === null || event.key === PLANNED_IDS_KEY)
      } catch { return false }
    },
  }
}
