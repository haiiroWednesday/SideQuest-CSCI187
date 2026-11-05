// MODEL: historical M1 browser-local events, validation and storage recovery.
// Optional descriptions and local-clock rules preserve existing saved records.
export type LegacyCampusEvent = {
  id: string
  title: string
  description?: string // optional for compatibility with events already saved in M1
  location: string
  date: string // YYYY-MM-DD, local calendar date
  start: string // HH:MM, same day
  end: string
}

// Historical drafts receive IDs when successfully stored.
export type LegacyEventDraft = Omit<LegacyCampusEvent, 'id'>

// Preserve old export names for M1 fixtures and historical browser storage.
// The active shared catalog uses CampusEvent/EventDraft from eventCatalog.ts.
export type CampusEvent = LegacyCampusEvent
export type EventDraft = LegacyEventDraft

export const STORAGE_KEY = 'sidequest.created-events.v1'
export const MAX_EVENT_TITLE_LENGTH = 100
export const MAX_EVENT_LOCATION_LENGTH = 100
export const MAX_EVENT_DESCRIPTION_LENGTH = 500

// Event dates are calendar dates, so compare them in the user's local timezone,
// never against toISOString() (which uses UTC and can shift the date).
export function todayLocalISO(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Turn a strict HH:MM time into minutes after midnight; null means invalid.
export function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

// Check the date format and the real calendar day. JavaScript may roll
// impossible dates into the next month, so compare the parsed parts back.
export function isValidDate(date: string): boolean {
  // A syntactically valid date can still be impossible (for example, February 30).
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day
}


// Domain rules remain independent of UI components and storage adapters.
export type EventSearchWindow = { date: string; start: string; end: string }
export type EventDraftValidation = { event: CampusEvent | null; error: string | null }

// Model rules also apply when there's no React form. This function returns
// a cleaned event on success or a specific error when input is invalid.
export function validateEventDraft(
  draft: EventDraft, id: string, existingEvents: CampusEvent[], now: Date = new Date(),
): EventDraftValidation {
  const title = draft.title.trim()
  const location = draft.location.trim()
  // Historical saved drafts may have no description.
  const description = draft.description?.trim() ?? ''
  if (title.length > MAX_EVENT_TITLE_LENGTH || location.length > MAX_EVENT_LOCATION_LENGTH) {
    return { event: null, error: 'Event titles and locations must be 100 characters or fewer.' }
  }
  if (!title || !location) {
    return { event: null, error: 'Please enter an event title and location.' }
  }
  if (!isValidDate(draft.date)) {
    return { event: null, error: 'Please choose a valid event date.' }
  }
  // ISO-style YYYY-MM-DD dates sort in calendar order as text because
  // their year, month, and day fields always use fixed-width digits.
  if (draft.date < todayLocalISO(now)) {
    return { event: null, error: 'Events cannot be created in the past. Choose today or a future date.' }
  }
  if (description.length > MAX_EVENT_DESCRIPTION_LENGTH) {
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
  // Duplicate titles are allowed; duplicate IDs would make records ambiguous.
  if (!id.trim() || existingEvents.some(event => event.id === id)) {
    return { event: null, error: 'Could not create a unique event. Please try again.' }
  }
  // Preserve the historical storage shape when description is blank.
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

// Filter to events entirely inside the chosen free time, then sort matches.
// The original events array is left in its existing order.
export function matchingEvents(events: CampusEvent[], window: EventSearchWindow): CampusEvent[] {
  return events.filter(event => fitsFully(event, window.date, window.start, window.end))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export type RemovedEvent = { event: CampusEvent; index: number }
// Return an undo receipt without mutating the original event list.
export function removeEventFromList(events: CampusEvent[], id: string): { events: CampusEvent[]; removed: RemovedEvent | null } {
  const index = events.findIndex(event => event.id === id)
  if (index === -1) return { events, removed: null }
  return { events: events.filter(event => event.id !== id), removed: { event: events[index], index } }
}

export function restoreEventInList(events: CampusEvent[], removed: RemovedEvent): CampusEvent[] {
  if (events.some(event => event.id === removed.event.id)) return events
  const restored = events.slice()
  // Restore the original position without changing the input array.
  restored.splice(Math.min(restored.length, removed.index), 0, removed.event)
  return restored
}

// A once-valid saved event may become past; preserve it for history.
export function isPastEventDate(event: CampusEvent, now: Date = new Date()): boolean {
  const date = todayLocalISO(now)
  const minute = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
  return event.date < date || (event.date === date && event.end <= minute)
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
  // Saved JSON must pass runtime checks before becoming an event.
  const item = value as Partial<CampusEvent>
  return typeof item.id === 'string' && item.id.trim().length > 0 &&
    typeof item.title === 'string' && item.title.trim().length > 0 && item.title.trim().length <= MAX_EVENT_TITLE_LENGTH &&
    (item.description === undefined || (typeof item.description === 'string' && item.description.length <= MAX_EVENT_DESCRIPTION_LENGTH)) &&
    typeof item.location === 'string' && item.location.trim().length > 0 && item.location.trim().length <= MAX_EVENT_LOCATION_LENGTH &&
    typeof item.date === 'string' && isValidDate(item.date) &&
    typeof item.start === 'string' && typeof item.end === 'string' &&
    toMinutes(item.start) !== null && toMinutes(item.end) !== null &&
    (toMinutes(item.start) as number) < (toMinutes(item.end) as number)
}

// localStorage is a browser-only prototype store; other computers do NOT share its events.
export type StoredEventsState = { events: CampusEvent[]; blocked: boolean }

// Never silently replace unreadable or partially invalid stored data with [].
// Callers must obtain explicit recovery consent before overwriting damaged data.
// If even one saved record is bad, report blocked=true so the UI can ask
// permission before replacing the original damaged browser data.
export function readStoredEventsChecked(storage: Pick<Storage, 'getItem'>): StoredEventsState {
  try {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved === null) return { events: [], blocked: false }
    // Saved JSON remains untrusted until every record passes validation.
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return { events: [], blocked: true }
    // Keep the first valid occurrence of a saved ID before recovery.
    const ids = new Set<string>()
    const events: CampusEvent[] = []
    for (const value of parsed) {
      if (!isCampusEvent(value) || ids.has(value.id)) continue
      ids.add(value.id)
      events.push(value)
    }
    // If an entry was skipped (bad data or duplicate ID), keep the good
    // events but block writes until the user confirms recovery.
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
