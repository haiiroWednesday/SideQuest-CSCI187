// MODEL: shared M2 event contract, validation and storage-independent catalog.
// Consumers depend on EventCatalogPort; adapters translate database rows.
// Historical M1 event data remains in events.ts for existing browser records.
import { isValidDate, toMinutes } from './events'
import { isEventSource, isTagSource, normalizeTags, TAG_ERROR, type EventSource, type EventTag, type TagSource } from './eventTags'

export type CampusEvent = {
  id: string
  title: string
  hostName: string
  description: string
  location: string
  date: string  // YYYY-MM-DD in America/Los_Angeles
  start: string // HH:mm on date
  end: string   // HH:mm on date, strictly after start
  // SCU's posting policy (scu.edu/csi/organizations/resources/advertising): every ad names
  // the primary student organizer and their contact, and carries the Access Policy
  // Statement built from them. Optional on read so events posted before the rule still load.
  organizer?: string     // primary student organizer
  contact?: string       // their email address or phone number
  accessibility?: string // the Access Policy Statement, always accessStatement(organizer, contact)
  // Who hosts it. Student organization events must carry the statement; university
  // department events may skip it (team decision, Nov 24). Absent on older events.
  hostKind?: HostKind
  // Optional host-set attributes students can filter on (free food, guest speaker, ...).
  tags?: EventTag[]
  /** Who set the tags: the host on Post, or a reviewer for imported events. Never inferred. */
  tagsBy?: TagSource
  /** Where the event came from; absent means a host posted it in SideQuest. */
  source?: EventSource
}

export const HOST_KINDS = ['student-org', 'department'] as const
export type HostKind = typeof HOST_KINDS[number]
export const isHostKind = (value: unknown): value is HostKind => (HOST_KINDS as readonly unknown[]).includes(value)
/** SCU's ADA/504 statement, organizer contact and space check on Post. Off (Cyn, Nov 24): it adds
 *  friction for hosts without giving students anything they use, and it is not an extra-credit item.
 *  The fields stay optional, so imported events that carry them keep them. */
export const ACCESS_POLICY_ON = false
// A post with no host kind is held to the student organization rule, the stricter one.
const needsStatement = (draft: Pick<EventDraft, 'hostKind'>) => draft.hostKind !== 'department'
// The statement exists only when both of its blanks are filled.
function builtStatement(organizer: unknown, contact: unknown): string | undefined {
  const name = String(organizer ?? '').trim(), reach = String(contact ?? '').trim()
  return name && reach ? accessStatement(name, reach) : undefined
}

// A post also confirms its room or space is booked (SCU: advertise only after confirmation).
// The confirmation gates posting and is not stored.
export type EventDraft = Omit<CampusEvent, 'id'> & { spaceConfirmed?: boolean }

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

// The posting-policy fields. Optional in storage (older events have none), required
// for every new post. Mirrored by supabase/proposals/20261125010000_event_access_contact_REVIEW_ONLY.sql (review only).
export const ACCESS_LIMITS = {
  organizer: 60,
  contact: 120,
  accessibility: 500,
} as const
type AccessField = keyof typeof ACCESS_LIMITS
const ACCESS_FIELDS = Object.keys(ACCESS_LIMITS) as AccessField[]

// SCU's Access Policy Statement, word for word. Hosts fill NAME and contact only.
export const ACCESS_STATEMENT_START = 'In compliance with the ADA/504, please direct your accommodation requests to '
export function accessStatement(organizer: string | undefined, contact: string | undefined): string {
  return `${ACCESS_STATEMENT_START}${String(organizer ?? '').trim()} at ${String(contact ?? '').trim()}.`
}
// SCU asks for an email address; a phone number is acceptable.
const CONTACT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_PHONE = /^\+?[\d\s().-]+$/
export function isContactEmailOrPhone(text: string): boolean {
  return CONTACT_EMAIL.test(text) || (CONTACT_PHONE.test(text) && text.replace(/\D/g, '').length >= 7 && text.replace(/\D/g, '').length <= 15)
}

// Posting-only limits, applied by catalogPostingErrors() and mirrored by the
// anonymous INSERT policy in
// supabase/migrations/20261111000000_event_text_posting_rules.sql. They are
// stricter than CATALOG_LIMITS (the storage ceiling), which read paths keep
// using so older, longer events still list, open and can be planned.
// Each value must stay <= the matching CATALOG_LIMITS value.
export const POSTING_LIMITS = {
  title: 80,
  hostName: 60,
  description: 1000,
  location: 120,
} as const

// Names and places need at least one Unicode letter (L*) or decimal digit (Nd),
// so text made only of symbols or emoji cannot be posted. \p{Nd} rather than \p{N} matches
// ICU's u_isalnum, which the database policy uses via [[:alnum:]] with the
// "und-x-icu" collation, so app and database accept the same text.
const LETTER_OR_DIGIT = /[\p{L}\p{Nd}]/u
const REQUIRES_LETTER_OR_DIGIT = ['title', 'hostName', 'location'] as const

export function hasLetterOrDigit(text: string): boolean {
  return LETTER_OR_DIGIT.test(text)
}

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
// The seven fields every stored event has. Organizer, contact and the space check follow them in the form.
export const BASE_FIELD_ORDER = ['title', 'hostName', 'description', 'location', 'date', 'start', 'end'] as const
export const DRAFT_FIELD_ORDER: readonly (keyof EventDraft)[] = [...BASE_FIELD_ORDER, 'hostKind', 'organizer', 'contact', 'spaceConfirmed', 'tags']

export function trimDraft(draft: EventDraft): EventDraft {
  return {
    title: String(draft.title ?? '').trim(),
    hostName: String(draft.hostName ?? '').trim(),
    description: String(draft.description ?? '').trim(),
    location: String(draft.location ?? '').trim(),
    date: draft.date,
    start: draft.start,
    end: draft.end,
    // Present only when given, so drafts from before the posting rule keep their exact shape.
    // The statement is always built from organizer and contact, never typed, so its wording stays SCU's.
    ...(draft.organizer !== undefined ? { organizer: String(draft.organizer ?? '').trim() } : {}),
    ...(draft.contact !== undefined ? { contact: String(draft.contact ?? '').trim() } : {}),
    ...(builtStatement(draft.organizer, draft.contact) !== undefined ? { accessibility: builtStatement(draft.organizer, draft.contact) } : {}),
    ...(draft.hostKind !== undefined ? { hostKind: draft.hostKind } : {}),
    ...(draft.spaceConfirmed !== undefined ? { spaceConfirmed: draft.spaceConfirmed === true } : {}),
    // Tags stay as given here; catalogDraftErrors() refuses unknown ones and toEventRow() orders them.
    ...(draft.tags !== undefined ? { tags: draft.tags } : {}),
    // A post can only ever be tagged by its host; reviewer tags come from the import pipeline.
    ...(draft.tags !== undefined ? { tagsBy: 'host' as const } : {}),
  }
}

// Validate field shape and field lengths for every caller, matching the
// database CHECK constraints. The separate catalogPostingErrors() adds the
// posting-only text and campus-time rules; createEventCatalog() enforces both before every insert.
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
  for (const field of ACCESS_FIELDS) {
    const value = trimmed[field]
    if (value === undefined) continue
    if (typeof value !== 'string') errors[field] = ACCESS_MESSAGES[field].missing
    else if (value.length > ACCESS_LIMITS[field]) errors[field] = `The ${ACCESS_MESSAGES[field].label} must be ${ACCESS_LIMITS[field]} characters or fewer.`
  }
  if (trimmed.tags !== undefined && normalizeTags(trimmed.tags) === null) errors.tags = TAG_ERROR
  if (trimmed.hostKind !== undefined && !isHostKind(trimmed.hostKind)) errors.hostKind = 'Choose who hosts the event.'
  return errors
}

const ACCESS_MESSAGES: Record<AccessField, { label: string; missing: string }> = {
  organizer: { label: 'organizer name', missing: 'Add the primary student organizer\'s name.' },
  contact: { label: 'contact', missing: 'Add the organizer\'s email or phone number.' },
  accessibility: { label: 'access statement', missing: 'Add the organizer\'s name and contact for the access statement.' },
}
export const SPACE_CONFIRM_ERROR = 'Confirm the room or space is booked. SCU asks hosts to advertise only after that.'

export const postingDraftErrors = catalogPostingErrors

export function isCatalogEvent(value: unknown): value is CampusEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<CampusEvent>
  if (typeof event.id !== 'string' || !event.id.trim()) return false
  for (const field of BASE_FIELD_ORDER) if (typeof event[field] !== 'string') return false
  for (const field of ACCESS_FIELDS) if (event[field] !== undefined && typeof event[field] !== 'string') return false
  if (event.tags !== undefined && normalizeTags(event.tags) === null) return false
  if (event.hostKind !== undefined && !isHostKind(event.hostKind)) return false
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

// Building an Intl formatter is slow (it showed up as the lag when a card opens), so make one and reuse it.
let campusFormat: Intl.DateTimeFormat | null = null
export function campusNow(now: Date = new Date()): { date: string; time: string } {
  campusFormat ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  const parts = campusFormat.formatToParts(now)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

// Posting horizon: an event date may be at most this many years after the
// current campus date, inclusive. Posting and the Post form's date max use
// latestPostingDate(). This is a posting rule only: the Schedule does not
// apply it to events that are already in the catalog.
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
  return isValidDate(date) && date >= campusNow(now).date && date <= latestPostingDate(now)
}

// The same posting-time rule must protect every catalog caller, including
// scripts or future controllers that do not use the React posting form.
// Use the Santa Clara wall-clock, not the browser's arbitrary timezone.
export function catalogPostingErrors(draft: EventDraft, now: Date = new Date()): CatalogFieldErrors {
  const errors = catalogDraftErrors(draft)
  const value = trimDraft(draft)
  const campus = campusNow(now)
  // Text rules for new posts only; a blank field keeps its "Please enter" message.
  for (const field of Object.keys(POSTING_LIMITS) as (keyof typeof POSTING_LIMITS)[]) {
    if (!value[field]) continue
    if (value[field].length > POSTING_LIMITS[field]) {
      errors[field] = `The ${FIELD_LABELS[field]} must be ${POSTING_LIMITS[field]} characters or fewer.`
    } else if ((REQUIRES_LETTER_OR_DIGIT as readonly string[]).includes(field) && !hasLetterOrDigit(value[field])) {
      errors[field] = `The ${FIELD_LABELS[field]} must include at least one letter or number.`
    }
  }
  // SCU's posting policy: a student organization post names its organizer and contact and
  // carries the Access Policy Statement built from them. A department post may skip all three,
  // but a statement it does give must be complete. Every post has its room or space confirmed.
  const statementRequired = ACCESS_POLICY_ON && (needsStatement(value) || Boolean(value.organizer || value.contact))
  for (const field of ['organizer', 'contact'] as const) {
    if (errors[field]) continue
    const text = value[field] ?? ''
    if (!text && !statementRequired) continue
    if (!text) errors[field] = ACCESS_POLICY_ON && needsStatement(value) ? ACCESS_MESSAGES[field].missing : `${ACCESS_MESSAGES[field].missing.replace(/\.$/, '')}, or leave both empty.`
    else if (!hasLetterOrDigit(text)) errors[field] = `The ${ACCESS_MESSAGES[field].label} must include at least one letter or number.`
  }
  if (!errors.contact && value.contact && !isContactEmailOrPhone(value.contact)) {
    errors.contact = 'Use an email address or a phone number.'
  }
  if (!errors.organizer && !errors.contact && value.accessibility && value.accessibility.length > ACCESS_LIMITS.accessibility) {
    errors.contact = ACCESS_MESSAGES.accessibility.missing
  }
  if (ACCESS_POLICY_ON && value.spaceConfirmed !== true) errors.spaceConfirmed = SPACE_CONFIRM_ERROR
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
  // Null on events posted before the posting-policy columns existed.
  organizer?: string | null
  contact?: string | null
  accessibility?: string | null
  host_kind?: string | null
  // text[]; null on events posted before the tags column existed (20261125020000_event_tags.sql).
  tags?: string[] | null
  tags_by?: string | null
  /** Set by the import pipeline (PR #86); absent on events posted in SideQuest. */
  source?: string | null
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
    // The statement is rebuilt here too, so no caller can store other wording.
    ...(draft.organizer ? { organizer: draft.organizer } : {}),
    ...(builtStatement(draft.organizer, draft.contact) !== undefined ? { accessibility: builtStatement(draft.organizer, draft.contact) } : {}),
    ...(draft.hostKind !== undefined ? { host_kind: draft.hostKind } : {}),
    ...(draft.tags !== undefined && normalizeTags(draft.tags)?.length ? { tags: normalizeTags(draft.tags)!, tags_by: draft.tagsBy ?? 'host' } : {}),
    ...(draft.contact ? { contact: draft.contact } : {}),
  }
}

function rowTags(value: unknown, by: unknown): { tags?: EventTag[]; tagsBy?: TagSource } {
  if (!Array.isArray(value)) return {}
  const known = normalizeTags(value.filter(tag => normalizeTags([tag]) !== null))
  return known?.length ? { tags: known, tagsBy: isTagSource(by) ? by : 'host' } : {}
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
    ...(typeof row.organizer === 'string' && row.organizer ? { organizer: row.organizer } : {}),
    ...(typeof row.accessibility === 'string' && row.accessibility ? { accessibility: row.accessibility } : {}),
    ...(typeof row.contact === 'string' && row.contact ? { contact: row.contact } : {}),
    ...(isHostKind(row.host_kind) ? { hostKind: row.host_kind } : {}),
    // An unknown tag from storage is dropped rather than shown; the rest stay.
    ...rowTags(row.tags, row.tags_by),
    ...(isEventSource(row.source) ? { source: row.source } : {}),
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
