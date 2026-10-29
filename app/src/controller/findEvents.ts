// CONTROLLER: Validate requests and coordinate the View with the Model.
import {
  fitsFully, isValidDate, toMinutes, todayLocalISO, formatEventDate, formatEventTime,
  readStoredEvents, saveStoredEvents, type CampusEvent, type EventDraft,
} from '../model/events'

export type { CampusEvent, EventDraft } from '../model/events'

// All View-to-Model operations pass through the Controller.
export function todayLocal(now: Date = new Date()): string {
  return todayLocalISO(now)
}

export function displayDate(date: string): string {
  return formatEventDate(date)
}

export function displayTime(time: string): string {
  return formatEventTime(time)
}

export function loadEvents(storage: Pick<Storage, 'getItem'>): CampusEvent[] {
  return readStoredEvents(storage)
}

export function persistEvents(storage: Pick<Storage, 'setItem'>, events: CampusEvent[]): boolean {
  return saveStoredEvents(storage, events)
}

export function removeEvent(events: CampusEvent[], id: string): CampusEvent[] {
  return events.filter((event) => event.id !== id)
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
  if (!id || events.some((event) => event.id === id)) {
    return { events, error: 'Could not create a unique event. Please try again.' }
  }
  return {
    error: null,
    events: [...events, { id, title, ...(description ? { description } : {}), location, date: draft.date, start: draft.start, end: draft.end }],
  }
}
