// MODEL: device-local plan identities, ordering, overlap rules and persistence.
// No React or Controller imports. Catalog events are never changed by a plan.
import { CATALOG_LIMITS } from './eventCatalog'
import { overlapSpan } from './eventTiming'
import { isValidDate, toMinutes, type LegacyCampusEvent } from './events'

// Saved plans resolve current catalog records and archived browser-local records.
export type ScheduleEvent = LegacyCampusEvent & { hostName?: string }

// Schedule accepts catalog events using the M2 field limits. Legacy M1
// events lack hostName and may lack description; they remain readable.
// Do not reuse the M1 isCampusEvent guard: its 500-character description
// limit incorrectly rejects valid 501–2000-character public events.
export function isScheduleEvent(value: unknown): value is ScheduleEvent {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  const text = (key: string, max: number) =>
    typeof item[key] === 'string' &&
    (item[key] as string).trim().length > 0 &&
    (item[key] as string).length <= max
  const date = item.date
  const start = item.start
  const end = item.end
  const first = typeof start === 'string' ? toMinutes(start) : null
  const last = typeof end === 'string' ? toMinutes(end) : null
  return (
    typeof item.id === 'string' &&
    item.id.trim().length > 0 &&
    text('title', CATALOG_LIMITS.title) &&
    text('location', CATALOG_LIMITS.location) &&
    (item.hostName === undefined || text('hostName', CATALOG_LIMITS.hostName)) &&
    (item.description === undefined ||
      (typeof item.description === 'string' &&
        item.description.length <= CATALOG_LIMITS.description)) &&
    typeof date === 'string' &&
    isValidDate(date) &&
    first !== null &&
    last !== null &&
    first < last
  )
}

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
    const ids = [
      ...new Set(
        parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
      ),
    ]
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

export function addPlannedId(
  ids: string[],
  id: string,
): { ids: string[]; added: boolean; error: string | null } {
  if (!id.trim()) return { ids, added: false, error: 'An event ID is required.' }
  // Already planned is an idempotent success, even at capacity.
  if (ids.includes(id)) return { ids, added: false, error: null }
  if (!canAddPlanCount(ids.length)) return { ids, added: false, error: SCHEDULE_LIMIT_MESSAGE }
  return { ids: [...ids, id], added: true, error: null }
}

export function removePlannedId(ids: readonly string[], id: string): string[] {
  return ids.filter(plannedId => plannedId !== id)
}

export function compareEventTime(a: ScheduleEvent, b: ScheduleEvent): number {
  return (
    a.date.localeCompare(b.date) ||
    a.start.localeCompare(b.start) ||
    a.end.localeCompare(b.end) ||
    a.id.localeCompare(b.id)
  )
}

export function resolvePlannedEvents(ids: readonly string[], catalog: readonly ScheduleEvent[]) {
  const byId = new Map(catalog.filter(isScheduleEvent).map(event => [event.id, event]))
  return {
    events: ids.flatMap(id => (byId.has(id) ? [byId.get(id)!] : [])).sort(compareEventTime),
    missingIds: ids.filter(id => !byId.has(id)),
  }
}

// Half-open intervals: 10:00-11:00 and 11:00-12:00 do not overlap.
export function eventsOverlap(a: ScheduleEvent, b: ScheduleEvent): boolean {
  return overlapSpan(a, b) !== null
}

// One representative conflicting event per plan keeps a busy schedule's output
// linear in size. Sorting + a sweep also avoids comparing every possible pair.
export function scheduleConflicts(events: readonly ScheduleEvent[]): Map<string, ScheduleEvent> {
  const conflicts = new Map<string, ScheduleEvent>()
  let furthest: ScheduleEvent | undefined
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
