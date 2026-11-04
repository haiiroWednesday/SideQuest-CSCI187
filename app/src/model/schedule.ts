// MODEL: device-local plan identities, ordering, overlap rules and persistence.
// No React or Controller imports. Catalog events are never changed by a plan.
import { isCampusEvent, toMinutes, type CampusEvent } from './events'

export const PLANNED_IDS_KEY = 'sidequest.planned-event-ids.v1'
// Provisional MVP limit pending whole-team confirmation. Keep validation and messages consistent.
export const MAX_PLANNED_EVENTS = 100
export const SCHEDULE_LIMIT_MESSAGE = `Your schedule has reached the ${MAX_PLANNED_EVENTS}-event limit. Remove a plan before adding another.`
export type PlannedIdsState = { ids: string[]; blocked: boolean }
export type PlanStorage = Pick<Storage, 'getItem' | 'setItem'>

export function canAddPlanCount(count: number): boolean {
  return Number.isSafeInteger(count) && count >= 0 && count < MAX_PLANNED_EVENTS
}

export function readPlannedIds(storage: Pick<Storage, 'getItem'>): PlannedIdsState {
  try {
    const saved = storage.getItem(PLANNED_IDS_KEY)
    if (saved === null) return { ids: [], blocked: false }
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return { ids: [], blocked: true }
    const ids = [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))]
    // Older schedules may exceed the new cap. Preserve them and allow removal;
    // the add rule prevents further additions until they are below the limit.
    return { ids, blocked: ids.length !== parsed.length }
  } catch {
    return { ids: [], blocked: true }
  }
}

export function savePlannedIds(storage: Pick<Storage, 'setItem'>, ids: readonly string[]): boolean {
  try {
    storage.setItem(PLANNED_IDS_KEY, JSON.stringify(ids))
    return true
  } catch {
    return false
  }
}

export function addPlannedId(ids: string[], id: string): { ids: string[]; added: boolean; error: string | null } {
  if (!id.trim()) return { ids, added: false, error: 'An event ID is required.' }
  // Already planned is an idempotent success, even at capacity.
  if (ids.includes(id)) return { ids, added: false, error: null }
  if (!canAddPlanCount(ids.length)) return { ids, added: false, error: SCHEDULE_LIMIT_MESSAGE }
  return { ids: [...ids, id], added: true, error: null }
}

export function removePlannedId(ids: readonly string[], id: string): string[] {
  return ids.filter(plannedId => plannedId !== id)
}

export function compareEventTime(a: CampusEvent, b: CampusEvent): number {
  return a.date.localeCompare(b.date) || a.start.localeCompare(b.start) ||
    a.end.localeCompare(b.end) || a.id.localeCompare(b.id)
}

export function resolvePlannedEvents(ids: readonly string[], catalog: readonly CampusEvent[]) {
  const byId = new Map(catalog.filter(isCampusEvent).map(event => [event.id, event]))
  return {
    events: ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []).sort(compareEventTime),
    missingIds: ids.filter(id => !byId.has(id)),
  }
}

// Half-open intervals: 10:00-11:00 and 11:00-12:00 do not overlap.
export function eventsOverlap(a: CampusEvent, b: CampusEvent): boolean {
  if (a.id === b.id || a.date !== b.date) return false
  const aStart = toMinutes(a.start), aEnd = toMinutes(a.end)
  const bStart = toMinutes(b.start), bEnd = toMinutes(b.end)
  return aStart !== null && aEnd !== null && bStart !== null && bEnd !== null &&
    aStart < aEnd && bStart < bEnd && aStart < bEnd && bStart < aEnd
}

// One representative conflicting event per plan keeps a busy schedule's output
// linear in size. Sorting + a sweep also avoids comparing every possible pair.
export function scheduleConflicts(events: readonly CampusEvent[]): Map<string, CampusEvent> {
  const conflicts = new Map<string, CampusEvent>()
  let furthest: CampusEvent | undefined
  for (const event of [...events].sort(compareEventTime)) {
    if (!furthest || event.date !== furthest.date) {
      furthest = event
      continue
    }
    if (eventsOverlap(event, furthest)) {
      conflicts.set(event.id, furthest)
      if (!conflicts.has(furthest.id)) conflicts.set(furthest.id, event)
    }
    if (event.end > furthest.end) furthest = event
  }
  return conflicts
}
