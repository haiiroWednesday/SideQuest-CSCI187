// CONTROLLER: Coordinate View requests using business rules owned by the Model.
import {
  todayLocalISO, validateEventDraft, validateSearchWindow, matchingEvents,
  removeEventFromList, restoreEventInList, isPastEventDate,
  readStoredEvents, readStoredEventsChecked, saveStoredEvents, type CampusEvent, type EventDraft,
  type StoredEventsState, type RemovedEvent,
} from '../model/events'
import { formatEventDate, formatEventTime } from '../presentation/formatEvents'

export type { CampusEvent, EventDraft } from '../model/events'

// These values set a convenient initial suggestion in the form. They are
// separate from the Model's rules about whether an event is allowed.
// These constants choose convenient default form times. The Model still
// checks whether the time the user finally chooses is valid.
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

// Defaults should never suggest an event time that already passed today.
// Suggest a future one-hour slot, rounded to a 15-minute boundary.
// Near midnight use tomorrow so the initial form is not already invalid.
// Suggest a future, hour-long event rounded to a 15-minute slot.
// If there's no room left today, suggest tomorrow instead.
export function initialEventWindow(now: Date = new Date()): Pick<EventDraft, 'date' | 'start' | 'end'> {
  const start = Math.ceil((now.getHours() * 60 + now.getMinutes() + EVENT_DEFAULT_LEAD_MINUTES) / EVENT_DEFAULT_SLOT_MINUTES) * EVENT_DEFAULT_SLOT_MINUTES
  if (start + EVENT_DEFAULT_DURATION_MINUTES > END_OF_DAY_MINUTES) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return { date: todayLocalISO(tomorrow), start: '14:30', end: '15:30' }
  }
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

// Pick<Storage, 'getItem'> only requires an object with a getItem method.
// This allows both real browser storage and small test fakes.
// Pick means callers only need to supply a getItem method. Tests can
// use a tiny fake storage object instead of opening a real browser.
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

// First validate the user's free-time window, then ask the Model to
// return only fully fitting events sorted by start time.
// Check the free-time inputs first. If they're valid, ask the Model to
// return only events that fit fully within that time window.
export function findEvents(
  events: CampusEvent[], freeDate: string, freeStart: string, freeEnd: string,
): SearchResult {
  const window = { date: freeDate, start: freeStart, end: freeEnd }
  const error = validateSearchWindow(window)
  return error ? { matches: [], error } : { matches: matchingEvents(events, window), error: null }
}

// Controllers coordinate requests; the Model owns all reusable domain validation.
// Return a new event array on success, or the original array with an error.
// A new array helps React notice state changes without mutating old data.
// Let the Model validate the draft. Return either a new list plus the
// created event or the original list and an error for the View to show.
export function createEvent(events: CampusEvent[], draft: EventDraft, id: string, now: Date = new Date()): CreateResult {
  const { event, error } = validateEventDraft(draft, id, events, now)
  return event ? { events: [...events, event], error: null } : { events, error }
}
