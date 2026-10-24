// CONTROLLER: Validate requests and coordinate the View with the Model.
import {
  fitsFully, isValidDate, toMinutes, type CampusEvent, type EventDraft,
} from '../model/events'

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

export function createEvent(events: CampusEvent[], draft: EventDraft, id: string): CreateResult {
  const title = draft.title.trim()
  const location = draft.location.trim()
  if (!title || !location) {
    return { events, error: 'Please enter an event title and location.' }
  }
  if (!isValidDate(draft.date)) {
    return { events, error: 'Please choose a valid event date.' }
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
    events: [...events, { id, title, location, date: draft.date, start: draft.start, end: draft.end }],
  }
}
