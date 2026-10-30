// CONTROLLER: Coordinate View requests using business rules owned by the Model.
import {
  todayLocalISO, validateEventDraft, validateSearchWindow, matchingEvents,
  removeEventFromList, restoreEventInList, isPastEventDate,
  readStoredEvents, readStoredEventsChecked, saveStoredEvents, type CampusEvent, type EventDraft,
  type StoredEventsState, type RemovedEvent,
} from '../model/events'
import { formatEventDate, formatEventTime } from '../presentation/formatEvents'

export type { CampusEvent, EventDraft } from '../model/events'

// All View-to-Model operations pass through the Controller.
export function todayLocal(now: Date = new Date()): string {
  return todayLocalISO(now)
}

// Defaults should never suggest an event time that already passed today.
export function initialEventWindow(now: Date = new Date()): Pick<EventDraft, 'date' | 'start' | 'end'> {
  const start = Math.ceil((now.getHours() * 60 + now.getMinutes() + 30) / 15) * 15
  if (start + 60 > 23 * 60 + 59) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return { date: todayLocalISO(tomorrow), start: '14:30', end: '15:30' }
  }
  const hhmm = (minutes: number) =>
    String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
  return { date: todayLocalISO(now), start: hhmm(start), end: hhmm(start + 60) }
}

export function displayDate(date: string): string {
  return formatEventDate(date)
}

export function displayTime(time: string): string {
  return formatEventTime(time)
}

export function loadEventsChecked(storage: Pick<Storage, 'getItem'>): StoredEventsState {
  return readStoredEventsChecked(storage)
}

export function loadEvents(storage: Pick<Storage, 'getItem'>): CampusEvent[] {
  return readStoredEvents(storage)
}

export function persistEvents(storage: Pick<Storage, 'setItem'>, events: CampusEvent[]): boolean {
  return saveStoredEvents(storage, events)
}

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

export function findEvents(
  events: CampusEvent[], freeDate: string, freeStart: string, freeEnd: string,
): SearchResult {
  const window = { date: freeDate, start: freeStart, end: freeEnd }
  const error = validateSearchWindow(window)
  return error ? { matches: [], error } : { matches: matchingEvents(events, window), error: null }
}

// Controllers coordinate requests; the Model owns all reusable domain validation.
export function createEvent(events: CampusEvent[], draft: EventDraft, id: string, now: Date = new Date()): CreateResult {
  const { event, error } = validateEventDraft(draft, id, events, now)
  return event ? { events: [...events, event], error: null } : { events, error }
}
