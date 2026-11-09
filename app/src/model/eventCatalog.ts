// MODEL: shared M2 event contract, validation and storage-independent catalog.
// Consumers depend on EventCatalogPort; adapters translate database rows.
// Historical M1 event data remains in events.ts for existing browser records.
import { isValidDate, toMinutes } from './events'

export type CampusEvent = {
  id: string
  title: string
  hostName: string
  description: string
  location: string
  date: string  // YYYY-MM-DD in America/Los_Angeles
  start: string // HH:mm on date
  end: string   // HH:mm on date, strictly after start
}

export type EventDraft = Omit<CampusEvent, 'id'>

export interface EventCatalogPort {
  create(draft: EventDraft): Promise<CampusEvent>
  listUpcoming(): Promise<CampusEvent[]>
  getById(id: string): Promise<CampusEvent | null>
}

// ---------------------------------------------------------------------------
// Errors. Every port method returns a Promise, so a failure is a REJECTED
// promise holding an EventCatalogError. `kind` lets the UI decide what to show:
//   'invalid'     → the draft broke a rule; show `message` next to the form.
//   'unavailable' → storage could not be reached; show a retry message.
export type EventCatalogErrorKind = 'invalid' | 'unavailable'

export class EventCatalogError extends Error {
  readonly kind: EventCatalogErrorKind
  constructor(kind: EventCatalogErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'EventCatalogError'
    this.kind = kind
  }
}

// ---------------------------------------------------------------------------
// Field limits mirror the CHECK constraints in
// supabase/migrations/20261103000000_create_events.sql, so the app rejects
// the same drafts the database would, with a readable message.
export const CATALOG_LIMITS = {
  title: 120,
  hostName: 120,
  description: 2000,
  location: 200,
} as const

const FIELD_LABELS: Record<keyof typeof CATALOG_LIMITS, string> = {
  title: 'event title',
  hostName: 'host name',
  description: 'description',
  location: 'location',
}

// One message per invalid field, keyed by contract field name, so a form can
// show each error next to its own input. An empty object means valid.
export type CatalogFieldErrors = Partial<Record<keyof EventDraft, string>>

// The order in which fields are checked. It is also the order of the form.
export const DRAFT_FIELD_ORDER: readonly (keyof EventDraft)[] =
  ['title', 'hostName', 'description', 'location', 'date', 'start', 'end']

export function trimDraft(draft: EventDraft): EventDraft {
  return {
    title: String(draft.title ?? '').trim(),
    hostName: String(draft.hostName ?? '').trim(),
    description: String(draft.description ?? '').trim(),
    location: String(draft.location ?? '').trim(),
    date: draft.date,
    start: draft.start,
    end: draft.end,
  }
}

// Validate field shape and field lengths for every caller, matching the
// database CHECK constraints. The separate catalogPostingErrors() adds the
// campus-time rule; createEventCatalog() enforces both before every insert.
//
// Note: JavaScript counts an emoji as 2 characters, while Postgres counts it as 1.
// The app is therefore slightly stricter than the database, never looser.
export function catalogDraftErrors(draft: EventDraft): CatalogFieldErrors {
  const trimmed = trimDraft(draft)
  const errors: CatalogFieldErrors = {}
  for (const field of Object.keys(CATALOG_LIMITS) as (keyof typeof CATALOG_LIMITS)[]) {
    if (!trimmed[field]) errors[field] = `Please enter the ${FIELD_LABELS[field]}.`
    else if (trimmed[field].length > CATALOG_LIMITS[field]) {
      errors[field] = `The ${FIELD_LABELS[field]} must be ${CATALOG_LIMITS[field]} characters or fewer.`
    }
  }
  if (!isValidDate(trimmed.date)) errors.date = 'Please choose a valid event date.'
  const start = toMinutes(trimmed.start)
  const end = toMinutes(trimmed.end)
  if (start === null || end === null || start >= end) {
    errors[start === null ? 'start' : 'end'] = 'The event must end later than it starts, on the same day.'
  }
  return errors
}

export const postingDraftErrors = catalogPostingErrors

export function isCatalogEvent(value: unknown): value is CampusEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<CampusEvent>
  if (typeof event.id !== 'string' || !event.id.trim()) return false
  for (const field of DRAFT_FIELD_ORDER) if (typeof event[field] !== 'string') return false
  return firstFieldError(catalogDraftErrors(event as EventDraft)) === null
}

// The first error in form order, or null when there is none.
export function firstFieldError(errors: CatalogFieldErrors): string | null {
  for (const field of DRAFT_FIELD_ORDER) if (errors[field]) return errors[field]
  return null
}

// Check a draft against the shared contract and return a trimmed copy.
export function validateCatalogDraft(draft: EventDraft): { draft: EventDraft; error: null } | { draft: null; error: string } {
  const error = firstFieldError(catalogDraftErrors(draft))
  return error === null ? { draft: trimDraft(draft), error: null } : { draft: null, error }
}

// ---------------------------------------------------------------------------
// Campus clock. The contract says dates/times are Santa Clara wall-clock
// values, so "upcoming" is judged in America/Los_Angeles, not in UTC and not
// in whatever timezone the visitor's laptop happens to use.
export const CAMPUS_TIME_ZONE = 'America/Los_Angeles'

export function campusNow(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

// Posting horizon: an event date may be at most this many years after the
// current campus date, inclusive. Posting and the Post form's date max use
// latestPostingDate(); the Schedule check should use it too so they match.
export const MAX_POSTING_YEARS_AHEAD = 1

// The same month/day MAX_POSTING_YEARS_AHEAD years after the campus date.
// Feb 29 clamps to Feb 28 in a non-leap target year, matching Postgres
// `date + interval '1 year'`, so app and SQL reports agree on the boundary.
export function latestPostingDate(now: Date = new Date()): string {
  const [year, month, day] = campusNow(now).date.split('-').map(Number)
  const targetYear = year + MAX_POSTING_YEARS_AHEAD
  // Day 0 of the next month is the last day of `month` (UTC avoids DST).
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${String(targetYear).padStart(4, '0')}-${pad(month)}-${pad(Math.min(day, lastDay))}`
}

// YYYY-MM-DD strings compare in calendar order as text.
export function isWithinPostingHorizon(date: string, now: Date = new Date()): boolean {
  return date <= latestPostingDate(now)
}

// The same posting-time rule must protect every catalog caller, including
// scripts or future controllers that do not use the React posting form.
// Use the Santa Clara wall-clock, not the browser's arbitrary timezone.
export function catalogPostingErrors(draft: EventDraft, now: Date = new Date()): CatalogFieldErrors {
  const errors = catalogDraftErrors(draft)
  const value = trimDraft(draft)
  const campus = campusNow(now)
  if (!errors.date && value.date < campus.date) {
    errors.date = 'Events cannot be posted in the past. Choose today or a future date.'
  } else if (!errors.date && !isWithinPostingHorizon(value.date, now)) {
    errors.date = `Events can be posted up to one year ahead. Choose a date on or before ${latestPostingDate(now)}.`
  } else if (!errors.date && !errors.start && !errors.end &&
    value.date === campus.date && value.start < campus.time) {
    errors.start = 'This event has already started. Choose a future start time.'
  }
  return errors
}

// An event is upcoming until it ends. One that is still running counts too.
export function isUpcoming(event: Pick<CampusEvent, 'date' | 'end'>, now: Date = new Date()): boolean {
  const campus = campusNow(now)
  return event.date > campus.date || (event.date === campus.date && event.end > campus.time)
}

// Predictable order: date, then start time, then ID. Ties still sort the same
// way after a reload. YYYY-MM-DD and HH:mm strings sort correctly as text.
export function compareEvents(a: CampusEvent, b: CampusEvent): number {
  return a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id)
}

// ---------------------------------------------------------------------------
// Storage boundary. An EventTable is the minimum a backing store must do.
// It speaks database column names (snake_case) and the database assigns IDs,
// as Postgres does with `default gen_random_uuid()`.
//
// Adapters:
//   - supabaseEventTable.ts → the real shared catalog (Supabase Postgres)
//   - inMemoryEventTable.ts → TEST FIXTURE ONLY, not shared persistence
export type EventRow = {
  id: string
  title: string
  host_name: string
  description: string
  location: string
  event_date: string // YYYY-MM-DD
  start_time: string // Postgres returns HH:mm:ss for `time` columns
  end_time: string
}

export type NewEventRow = Omit<EventRow, 'id'>

// Browser and in-memory adapters match the SQL TIME format on reads.
export function toSqlTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

export interface EventTable {
  insert(row: NewEventRow): Promise<EventRow>
  // Rows whose event_date is on or after `date`. The catalog sorts them and
  // drops events that already ended earlier today.
  selectFromDate(date: string): Promise<EventRow[]>
  selectById(id: string): Promise<EventRow | null>
}

// Translate between application fields and database columns at this boundary.
export function toEventRow(draft: EventDraft): NewEventRow {
  return {
    title: draft.title,
    host_name: draft.hostName,
    description: draft.description,
    location: draft.location,
    event_date: draft.date,
    start_time: draft.start,
    end_time: draft.end,
  }
}

export function fromEventRow(row: EventRow): CampusEvent {
  return {
    id: String(row.id),
    title: row.title,
    hostName: row.host_name,
    description: row.description,
    location: row.location,
    date: row.event_date,
    // slice(0, 5) turns Postgres "14:00:00" into the contract's "14:00".
    start: row.start_time.slice(0, 5),
    end: row.end_time.slice(0, 5),
  }
}

// Postgres stores IDs in a `uuid` column. A malformed ID (for example, a stale
// value in someone's local Schedule) is simply "not found". It never reaches
// the database, which would answer with a type error instead.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isCatalogId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

// ---------------------------------------------------------------------------
// The one EventCatalog implementation. Every adapter shares the same
// validation, mapping, ordering and error behavior.
export function createEventCatalog(table: EventTable, clock: () => Date = () => new Date()): EventCatalogPort {
  const unavailable = (action: string, cause: unknown) =>
    new EventCatalogError('unavailable', `Could not ${action} right now. Please check your connection and try again.`, { cause })

  return {
    async create(draft) {
      const postingError = firstFieldError(catalogPostingErrors(draft, clock()))
      if (postingError !== null) throw new EventCatalogError('invalid', postingError)
      const result = validateCatalogDraft(draft)
      if (result.error !== null) throw new EventCatalogError('invalid', result.error)
      let row: EventRow
      try { row = await table.insert(toEventRow(result.draft)) }
      catch (cause) { throw new EventCatalogError('unavailable', 'Could not confirm this post. Check Discover before trying again.', { cause }) }
      return fromEventRow(row)
    },

    async listUpcoming() {
      const now = clock()
      let rows: EventRow[]
      try { rows = await table.selectFromDate(campusNow(now).date) }
      catch (cause) { throw unavailable('load events', cause) }
      return rows.map(fromEventRow).filter(event => isUpcoming(event, now)).sort(compareEvents)
    },

    async getById(id) {
      if (!isCatalogId(id)) return null
      let row: EventRow | null
      try { row = await table.selectById(id) }
      catch (cause) { throw unavailable('load this event', cause) }
      return row ? fromEventRow(row) : null
    },
  }
}
