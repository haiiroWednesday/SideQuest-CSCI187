// CONTROLLER: Validate requests and coordinate the View with the Model.
import {
  fitsFully, isValidDate, toMinutes, todayLocalISO,
  readStoredEvents, readStoredEventsChecked, saveStoredEvents, type CampusEvent, type EventDraft,
  type StoredEventsState,
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

export type RemovedEvent = { event: CampusEvent; index: number }
export function removeEventWithReceipt(events: CampusEvent[], id: string): { events: CampusEvent[]; removed: RemovedEvent | null } {
  const index = events.findIndex(event => event.id === id)
  if (index === -1) return { events, removed: null }
  return { events: events.filter(event => event.id !== id), removed: { event: events[index], index } }
}
export function restoreRemovedEvent(events: CampusEvent[], removed: RemovedEvent): CampusEvent[] {
  if (events.some(event => event.id === removed.event.id)) return events
  const restored = events.slice()
  restored.splice(Math.min(restored.length, removed.index), 0, removed.event)
  return restored
}
export function removeEvent(events: CampusEvent[], id: string): CampusEvent[] {
  return removeEventWithReceipt(events, id).events
}
export function isPastEvent(event: CampusEvent, now: Date = new Date()): boolean {
  const date = todayLocalISO(now)
  const minute = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  return event.date < date || (event.date === date && event.end < minute)
}

export type SearchResult = { matches: CampusEvent[]; error: string | null }
export type CreateResult = { events: CampusEvent[]; error: string | null }

export function findEvents(
  events: CampusEvent[], freeDate: string, freeStart: string, freeEnd: string,
): SearchResult {
  if (!isValidDate(freeDate)) {
    return { matches: [], error: 'Please choose a valid date.' }
  }
  const start = toMinutes(freeStart)
  const end = toMinutes(freeEnd)
  if (start === null || end === null || start >= end) {
    return { matches: [], error: 'Please choose an end time later than your start time.' }
  }
  return {
    error: null,
    matches: events
      .filter((event) => fitsFully(event, freeDate, freeStart, freeEnd))
      .sort((a, b) => a.start.localeCompare(b.start)),
  }
}

export function createEvent(events: CampusEvent[], draft: EventDraft, id: string, now: Date = new Date()): CreateResult {
  const title = draft.title.trim()
  const location = draft.location.trim()
  const description = draft.description?.trim() ?? ''
  if (title.length > 100 || location.length > 100) {
    return { events, error: 'Event titles and locations must be 100 characters or fewer.' }
  }
  if (!title || !location) {
    return { events, error: 'Please enter an event title and location.' }
  }
  if (!isValidDate(draft.date)) {
    return { events, error: 'Please choose a valid event date.' }
  }
  if (draft.date < todayLocalISO(now)) {
    return { events, error: 'Events cannot be created in the past. Choose today or a future date.' }
  }
  if (description.length > 500) {
    return { events, error: 'Keep the event description under 500 characters.' }
  }
  const start = toMinutes(draft.start)
  const end = toMinutes(draft.end)
  if (start === null || end === null || start >= end) {
    return { events, error: 'The event must end later than it starts, on the same day.' }
  }
  // Calendar-date validation alone permits events that already happened today.
  if (draft.date === todayLocalISO(now) && start < now.getHours() * 60 + now.getMinutes()) {
    return { events, error: 'This event has already started. Choose a future start time.' }
  }
  if (!id || events.some((event) => event.id === id)) {
    return { events, error: 'Could not create a unique event. Please try again.' }
  }
  return {
    error: null,
    events: [...events, { id, title, ...(description ? { description } : {}), location, date: draft.date, start: draft.start, end: draft.end }],
  }
}
