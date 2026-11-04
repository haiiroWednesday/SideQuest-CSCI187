// CONTROLLER: Coordinate View requests using business rules owned by the Model.
import {
  todayLocalISO, validateEventDraft, validateSearchWindow, matchingEvents,
  removeEventFromList, restoreEventInList, isPastEventDate,
  readStoredEvents, readStoredEventsChecked, saveStoredEvents, type CampusEvent, type EventDraft,
  type StoredEventsState, type RemovedEvent,
} from '../model/events'
import { formatEventDate, formatEventTime } from '../presentation/formatEvents'

export type { CampusEvent, EventDraft } from '../model/events'
export { STORAGE_KEY } from '../model/events'

// ⏳ These numbers suggest a convenient event time in the form.
// The Model separately checks whether the final choice is allowed.
const EVENT_DEFAULT_LEAD_MINUTES = 30
const EVENT_DEFAULT_SLOT_MINUTES = 15
const EVENT_DEFAULT_DURATION_MINUTES = 60
const END_OF_DAY_MINUTES = 24 * 60 - 1

// All View-to-Model operations pass through the Controller.
// These small wrappers let App.tsx ask the Controller for Model data
// without importing Model functions directly.
export function todayLocal(now: Date = new Date()): string {
  return todayLocalISO(now)
}

// 🗓️ Suggest a one-hour event that starts in the future.
// Round forward to a 15-minute boundary, or choose tomorrow near midnight.
export function initialEventWindow(now: Date = new Date()): Pick<EventDraft, 'date' | 'start' | 'end'> {
  // Math.ceil rounds UP, so 11:10 + 30 minutes becomes 11:45,
  // not 11:30 or a time that's already passed.
  const start = Math.ceil((now.getHours() * 60 + now.getMinutes() + EVENT_DEFAULT_LEAD_MINUTES) / EVENT_DEFAULT_SLOT_MINUTES) * EVENT_DEFAULT_SLOT_MINUTES
  if (start + EVENT_DEFAULT_DURATION_MINUTES > END_OF_DAY_MINUTES) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return { date: todayLocalISO(tomorrow), start: '14:30', end: '15:30' }
  }
  // Convert minute counts back to the HH:MM strings used by time inputs.
  // padStart(2, '0') turns 9 into "09" for consistent formatting.
  const hhmm = (minutes: number) =>
    String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
  return { date: todayLocalISO(now), start: hhmm(start), end: hhmm(start + EVENT_DEFAULT_DURATION_MINUTES) }
}

// Formatting changes what the user sees but not the date/time values
// the Model stores or uses for comparisons.
export function displayDate(date: string): string {
  return formatEventDate(date)
}

export function displayTime(time: string): string {
  return formatEventTime(time)
}

// 🧪 Pick<Storage, 'getItem'> requires only the getItem method.
// Our tests can supply a small fake object instead of browser storage.
export function loadEventsChecked(storage: Pick<Storage, 'getItem'>): StoredEventsState {
  return readStoredEventsChecked(storage)
}

export function loadEvents(storage: Pick<Storage, 'getItem'>): CampusEvent[] {
  return readStoredEvents(storage)
}

export function persistEvents(storage: Pick<Storage, 'setItem'>, events: CampusEvent[]): boolean {
  return saveStoredEvents(storage, events)
}

// Re-export these Model operations through the Controller for the View.
// The removal receipt remembers the event and where it appeared in the list.
export type { RemovedEvent } from '../model/events'
export function removeEventWithReceipt(events: CampusEvent[], id: string) {
  return removeEventFromList(events, id)
}
export function restoreRemovedEvent(events: CampusEvent[], removed: RemovedEvent): CampusEvent[] {
  return restoreEventInList(events, removed)
}
export function removeEvent(events: CampusEvent[], id: string): CampusEvent[] {
  return removeEventFromList(events, id).events
}
export function isPastEvent(event: CampusEvent, now: Date = new Date()): boolean {
  return isPastEventDate(event, now)
}

export type SearchResult = { matches: CampusEvent[]; error: string | null }
export type CreateResult = { events: CampusEvent[]; error: string | null }

// 🔎 Reject invalid free-time inputs before asking the Model to find
// matching events. A failed search returns an error and an empty list.
export function findEvents(
  events: CampusEvent[], freeDate: string, freeStart: string, freeEnd: string,
): SearchResult {
  const window = { date: freeDate, start: freeStart, end: freeEnd }
  const error = validateSearchWindow(window)
  // ? : is a short if/else: return the error when present; otherwise
  // return the actual matches. No search runs with an invalid window.
  return error ? { matches: [], error } : { matches: matchingEvents(events, window), error: null }
}

// 🧩 The Model validates the event. The Controller returns a NEW list on
// success so React can update without mutating the previous state.
export function createEvent(events: CampusEvent[], draft: EventDraft, id: string, now: Date = new Date()): CreateResult {
  const { event, error } = validateEventDraft(draft, id, events, now)
  // ...events copies the existing array, then appends the new event.
  // Failed validation simply returns the original list plus the error.
  return event ? { events: [...events, event], error: null } : { events, error }
}
