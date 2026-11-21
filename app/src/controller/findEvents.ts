// CONTROLLER: expose free-window matching to both M2 Discover and M1 fixtures.
// Historical M1 posting/storage helpers remain for compatibility.
import {
  todayLocalISO,
  validateEventDraft,
  validateSearchWindow,
  matchingEvents,
  removeEventFromList,
  restoreEventInList,
  isPastEventDate,
  readStoredEvents,
  readStoredEventsChecked,
  saveStoredEvents,
  type CampusEvent,
  type EventDraft,
  type StoredEventsState,
  type RemovedEvent,
} from '../model/events'
import { formatEventDate, formatEventTime } from '../presentation/formatEvents'

export type { CampusEvent, EventDraft } from '../model/events'
export { STORAGE_KEY } from '../model/events'

// Historical M1 form defaults; the Model validates the student's final choice.
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

// Suggest a one-hour event in local time, rolling into tomorrow near midnight.
export function initialEventWindow(
  now: Date = new Date(),
): Pick<EventDraft, 'date' | 'start' | 'end'> {
  const start =
    Math.ceil(
      (now.getHours() * 60 + now.getMinutes() + EVENT_DEFAULT_LEAD_MINUTES) /
        EVENT_DEFAULT_SLOT_MINUTES,
    ) * EVENT_DEFAULT_SLOT_MINUTES
  if (start + EVENT_DEFAULT_DURATION_MINUTES > END_OF_DAY_MINUTES) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return { date: todayLocalISO(tomorrow), start: '14:30', end: '15:30' }
  }
  const hhmm = (minutes: number) =>
    String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
  return {
    date: todayLocalISO(now),
    start: hhmm(start),
    end: hhmm(start + EVENT_DEFAULT_DURATION_MINUTES),
  }
}

// Formatting changes what the user sees but not the date/time values
// the Model stores or uses for comparisons.
export function displayDate(date: string): string {
  return formatEventDate(date)
}

export function displayTime(time: string): string {
  return formatEventTime(time)
}

// Accept the smallest storage interface needed so tests can substitute storage.
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

// Return an error without running a search when the requested window is invalid.
export function findEvents(
  events: CampusEvent[],
  freeDate: string,
  freeStart: string,
  freeEnd: string,
): SearchResult {
  const window = { date: freeDate, start: freeStart, end: freeEnd }
  const error = validateSearchWindow(window)
  return error ? { matches: [], error } : { matches: matchingEvents(events, window), error: null }
}

// Append only validated events; never mutate the list held by React.
export function createEvent(
  events: CampusEvent[],
  draft: EventDraft,
  id: string,
  now: Date = new Date(),
): CreateResult {
  const { event, error } = validateEventDraft(draft, id, events, now)
  return event ? { events: [...events, event], error: null } : { events, error }
}
