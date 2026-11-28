// CONTROLLER: prepare posting feedback and delegate validation and storage
// to the shared EventCatalogPort. The View never writes directly to storage.
import {
  createEventCatalog, EventCatalogError, firstFieldError, postingDraftErrors,
  type CampusEvent, type CatalogFieldErrors, type EventCatalogPort, type EventDraft,
} from '../model/eventCatalog'
import { browserCatalogUnreadable, createBrowserEventTable, recoverBrowserCatalog, type CatalogStorage } from '../model/browserEventTable'
import { readCatalogWithDeadline, CatalogReadTimeoutError } from './catalogReads'
import { createHttpEventCatalog } from '../model/httpEventCatalog'
import { deviceStorage } from '../model/deviceStorage'

export type { CampusEvent, CatalogFieldErrors, EventCatalogPort, EventDraft } from '../model/eventCatalog'

// ---------------------------------------------------------------------------
// Which catalog the app talks to. `shared` is false for the browser-only
// fallback, and the UI must say so on screen.
export const browserCatalogStorage = browserStorage()

export type ConnectedCatalog = { catalog: EventCatalogPort; shared: boolean }

export function localEventCatalog(storage: CatalogStorage): ConnectedCatalog {
  return { catalog: createEventCatalog(createBrowserEventTable(storage)), shared: false }
}

export function connectEventCatalog(env: Readonly<Record<string, unknown>>, storage: CatalogStorage): ConnectedCatalog {
  return env.shared === true ? { catalog: createHttpEventCatalog(), shared: true } : localEventCatalog(storage)
}

// Acquire storage only inside guarded Model reads/writes. A blocked getter must
// never prevent a configured shared catalog from starting.
export function browserStorage(): CatalogStorage {
  return {
    // Blocked storage falls back to memory for the visit (model/deviceStorage).
    getItem: key => deviceStorage().getItem(key),
    setItem: (key, value) => deviceStorage().setItem(key, value),
  }
}

/** The browser-only catalog holds data that cannot be read: Discover offers recovery, as My Schedule does. */
export function localCatalogDamaged(): boolean { return browserCatalogUnreadable(browserCatalogStorage) }
/** Keeps the events that still read, drops the damaged rest. Call only after the student agrees. */
export function recoverLocalCatalog(): boolean { return recoverBrowserCatalog(browserCatalogStorage) }
export const CATALOG_RECOVERY_CONFIRMATION = 'Replace unreadable saved events with the ones that can still be read? Unreadable entries will be discarded.'

export function connectBrowserEventCatalog(env: Readonly<Record<string, unknown>> = {}): ConnectedCatalog {
  return connectEventCatalog(env, browserStorage())
}

export async function connectServerEventCatalog(): Promise<ConnectedCatalog> {
  try {
    const response = await readCatalogWithDeadline(() => fetch('/api/catalog', { credentials: 'same-origin' }))
    if (!response.ok) throw new Error('configuration unavailable')
    const config: unknown = await response.json()
    if (!config || typeof config !== 'object' || !('shared' in config) || typeof config.shared !== 'boolean') throw new Error('invalid configuration')
    return connectBrowserEventCatalog({ shared: config.shared })
  } catch {
    // A network error never silently turns shared data into browser-only data.
    return { catalog: createHttpEventCatalog(), shared: true }
  }
}

export {
  postingDraftErrors, trimDraft, CATALOG_LIMITS, POSTING_LIMITS, ACCESS_LIMITS, campusNow, latestPostingDate,
  accessStatement, ACCESS_STATEMENT_START, ACCESS_POLICY_ON, HOST_KINDS,
} from '../model/eventCatalog'
export { initialCampusWindow } from '../model/eventTiming'
export { ATTEND_CHOICES, attendOf, type AttendMode } from '../model/attend'

export type PostResult =
  | { status: 'posted'; event: CampusEvent; message: string }
  | { status: 'invalid'; fieldErrors: CatalogFieldErrors; error: string }
  | { status: 'failed'; error: string }

export async function postEvent(
  catalog: EventCatalogPort, draft: EventDraft, options: { now?: Date; shared?: boolean } = {},
): Promise<PostResult> {
  const fieldErrors = postingDraftErrors(draft, options.now)
  const first = firstFieldError(fieldErrors)
  if (first !== null) return { status: 'invalid', fieldErrors, error: 'Please fix the highlighted fields.' }
  try {
    const event = await catalog.create(draft)
    const where = options.shared === false ? 'in this browser only (shared catalog not connected)' : 'to the shared catalog'
    return { status: 'posted', event, message: `Posted “${event.title}” ${where}. Event ID: ${event.id}` }
  } catch (error) {
    // The catalog re-checks against its own current clock. A request can cross
    // a minute boundary while in flight; preserve its validation message.
    if (error instanceof EventCatalogError) return { status: 'failed', error: error.message }
    return { status: 'failed', error: 'Could not post this event right now. Please try again.' }
  }
}

// The "Posted events" list next to the form. Errors become a message,
// never an exception, so the View can always show something honest.
export async function loadPostedEvents(catalog: EventCatalogPort): Promise<{ events: CampusEvent[]; error: string | null }> {
  try {
    return { events: await readCatalogWithDeadline(() => catalog.listUpcoming()), error: null }
  } catch (error) {
    return { events: [], error: error instanceof EventCatalogError || error instanceof CatalogReadTimeoutError ? error.message : 'Could not load posted events.' }
  }
}
