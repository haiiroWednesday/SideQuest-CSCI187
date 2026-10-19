// CONTROLLER: Receives the student's request and asks the model for matches.
import { fitsFully, sampleEvents, toMinutes, type CampusEvent } from '../model/events'

export type SearchResult = { matches: CampusEvent[]; error: string | null }

export function findEvents(freeStart: string, freeEnd: string): SearchResult {
  const start = toMinutes(freeStart)
  const end = toMinutes(freeEnd)
  if (start === null || end === null || start >= end) {
    return { matches: [], error: 'Please choose an end time later than your start time.' }
  }
  return {
    error: null,
    matches: sampleEvents.filter((event) => fitsFully(event, freeStart, freeEnd)),
  }
}
