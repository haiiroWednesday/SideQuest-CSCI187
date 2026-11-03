// CONTROLLER: the View requests every plan read/change here, never in the Model.
import { isCampusEvent, type CampusEvent } from '../model/events'
import {
  addPlannedId, readPlannedIds, removePlannedId, resolvePlannedEvents,
  savePlannedIds, scheduleConflicts, PLANNED_IDS_KEY,
  MAX_PLANNED_EVENTS, SCHEDULE_LIMIT_MESSAGE,
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

// This read-only catalog input is the current event source. It can come from
// the shared catalog when that adapter is integrated; plans store no copies.
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
  function result(state: PlannedIdsState, error: string | null = null, message: string | null = null, warning: string | null = null): ScheduleResult {
    return { schedule: present(state), error, message, warning }
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
    read(): ScheduleResult {
      const { state } = current()
      return result(state, state.blocked ? readError : null)
    },
    add(id: string): ScheduleResult {
      // Read on each action so another tab's latest plans are retained.
      // localStorage read/modify/write is best effort, not a transaction.
      const { state, storage } = current()
      if (state.blocked || !storage) return result(state, readError)
      const event = catalog.find(item => item.id === id && isCampusEvent(item))
      if (!event) return result(state, 'This event is unavailable. Refresh the event list before adding it.')
      const next = addPlannedId(state.ids, id)
      if (next.error) return result(state, next.error)
      if (!next.added) return result(state, null, 'This event is already in your plans.')
      if (!savePlannedIds(storage, next.ids)) return result(state, writeError)
      const updated = { ids: next.ids, blocked: false }
      const conflict = present(updated).entries.find(entry => entry.event.id === id)?.conflict
      return result(updated, null, `Added “${event.title}” to your plans.`,
        conflict ? `Schedule overlap: “${event.title}” overlaps “${conflict.title}”. Both remain in your plans; review their times.` : null)
    },
    remove(id: string): ScheduleResult {
      const { state, storage } = current()
      if (state.blocked || !storage) return result(state, readError)
      if (!state.ids.includes(id)) return result(state, null, 'This event is no longer in your plans.')
      const ids = removePlannedId(state.ids, id)
      if (!savePlannedIds(storage, ids)) return result(state, writeError)
      return result({ ids, blocked: false }, null, 'Removed from your plans. The original event has not been deleted.')
    },
    // Only called after the View obtains explicit recovery confirmation.
    recover(): ScheduleResult {
      const { state, storage } = current()
      if (!storage || !savePlannedIds(storage, state.ids)) return result(state, writeError)
      return result({ ids: state.ids, blocked: false }, null, 'Valid plans recovered.')
    },
    handlesStorageChange(event: StorageEvent): boolean {
      try {
        return event.storageArea === getStorage() && (event.key === null || event.key === PLANNED_IDS_KEY)
      } catch { return false }
    },
  }
}
