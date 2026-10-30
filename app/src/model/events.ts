// MODEL: Event data, time rules, and storage. No built-in fictional events.
export type CampusEvent = {
  id: string
  title: string
  description?: string // optional for compatibility with events already saved in M1
  location: string
  date: string // YYYY-MM-DD, local calendar date
  start: string // HH:MM, same day
  end: string
}

export type EventDraft = Omit<CampusEvent, 'id'>

export const STORAGE_KEY = 'sidequest.created-events.v1'

// Event dates are calendar dates, so compare them in the user's local timezone,
// never against toISOString() (which uses UTC and can shift the date).
export function todayLocalISO(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function isValidDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day
}


// DOMAIN RULES: independent of React, HTML form controls, storage and the Controller.
export type EventSearchWindow = { date: string; start: string; end: string }
export type EventDraftValidation = { event: CampusEvent | null; error: string | null }

export function validateEventDraft(
  draft: EventDraft, id: string, existingEvents: CampusEvent[], now: Date = new Date(),
): EventDraftValidation {
  const title = draft.title.trim()
  const location = draft.location.trim()
  const description = draft.description?.trim() ?? ''
  if (title.length > 100 || location.length > 100) {
    return { event: null, error: 'Event titles and locations must be 100 characters or fewer.' }
  }
  if (!title || !location) {
    return { event: null, error: 'Please enter an event title and location.' }
  }
  if (!isValidDate(draft.date)) {
    return { event: null, error: 'Please choose a valid event date.' }
  }
  if (draft.date < todayLocalISO(now)) {
    return { event: null, error: 'Events cannot be created in the past. Choose today or a future date.' }
  }
  if (description.length > 500) {
    return { event: null, error: 'Keep the event description under 500 characters.' }
  }
  const start = toMinutes(draft.start)
  const end = toMinutes(draft.end)
  if (start === null || end === null || start >= end) {
    return { event: null, error: 'The event must end later than it starts, on the same day.' }
  }
  // Calendar-date validity does not guarantee today's event has yet to start.
  if (draft.date === todayLocalISO(now) && start < now.getHours() * 60 + now.getMinutes()) {
    return { event: null, error: 'This event has already started. Choose a future start time.' }
  }
  if (!id || existingEvents.some(event => event.id === id)) {
    return { event: null, error: 'Could not create a unique event. Please try again.' }
  }
  return {
    event: { id, title, ...(description ? { description } : {}), location, date: draft.date, start: draft.start, end: draft.end },
    error: null,
  }
}

export function validateSearchWindow(window: EventSearchWindow): string | null {
  if (!isValidDate(window.date)) return 'Please choose a valid date.'
  const start = toMinutes(window.start)
  const end = toMinutes(window.end)
  if (start === null || end === null || start >= end) {
    return 'Please choose an end time later than your start time.'
  }
  return null
}

export function matchingEvents(events: CampusEvent[], window: EventSearchWindow): CampusEvent[] {
  return events.filter(event => fitsFully(event, window.date, window.start, window.end))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export type RemovedEvent = { event: CampusEvent; index: number }
export function removeEventFromList(events: CampusEvent[], id: string): { events: CampusEvent[]; removed: RemovedEvent | null } {
  const index = events.findIndex(event => event.id === id)
  if (index === -1) return { events, removed: null }
  return { events: events.filter(event => event.id !== id), removed: { event: events[index], index } }
}

export function restoreEventInList(events: CampusEvent[], removed: RemovedEvent): CampusEvent[] {
  if (events.some(event => event.id === removed.event.id)) return events
  const restored = events.slice()
  restored.splice(Math.min(restored.length, removed.index), 0, removed.event)
  return restored
}

export function isPastEventDate(event: CampusEvent, now: Date = new Date()): boolean {
  const date = todayLocalISO(now)
  const minute = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  return event.date < date || (event.date === date && event.end < minute)
}

export function fitsFully(event: CampusEvent, freeDate: string, freeStart: string, freeEnd: string): boolean {
  const start = toMinutes(freeStart)
  const end = toMinutes(freeEnd)
  const eventStart = toMinutes(event.start)
  const eventEnd = toMinutes(event.end)
  if (!isValidDate(freeDate) || !isValidDate(event.date) || event.date !== freeDate) return false
  if (start === null || end === null || eventStart === null || eventEnd === null) return false
  return start < end && eventStart < eventEnd && start <= eventStart && eventEnd <= end
}

export function isCampusEvent(value: unknown): value is CampusEvent {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<CampusEvent>
  return typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.title === 'string' && item.title.trim().length > 0 &&
    (item.description === undefined || (typeof item.description === 'string' && item.description.length <= 500)) &&
    typeof item.location === 'string' && item.location.trim().length > 0 &&
    typeof item.date === 'string' && isValidDate(item.date) &&
    typeof item.start === 'string' && typeof item.end === 'string' &&
    toMinutes(item.start) !== null && toMinutes(item.end) !== null &&
    (toMinutes(item.start) as number) < (toMinutes(item.end) as number)
}

// localStorage is a browser-only prototype store; other computers do NOT share its events.
export type StoredEventsState = { events: CampusEvent[]; blocked: boolean }

// Never silently replace unreadable or partially invalid stored data with [].
// Callers must obtain explicit recovery consent before overwriting damaged data.
export function readStoredEventsChecked(storage: Pick<Storage, 'getItem'>): StoredEventsState {
  try {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved === null) return { events: [], blocked: false }
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return { events: [], blocked: true }
    const ids = new Set<string>()
    const events: CampusEvent[] = []
    for (const value of parsed) {
      if (!isCampusEvent(value) || ids.has(value.id)) continue
      ids.add(value.id)
      events.push(value)
    }
    return { events, blocked: events.length !== parsed.length }
  } catch {
    return { events: [], blocked: true }
  }
}

// Legacy API is preserved for previously submitted M1 tests.
export function readStoredEvents(storage: Pick<Storage, 'getItem'>): CampusEvent[] {
  return readStoredEventsChecked(storage).events
}

export function saveStoredEvents(storage: Pick<Storage, 'setItem'>, events: CampusEvent[]): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(events))
    return true
  } catch {
    return false
  }
}
