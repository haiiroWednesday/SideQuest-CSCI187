// CONTROLLER: event posting (owner: Daven). The View hands this a draft. This
// file applies the posting rules, then asks the EventCatalogPort to store the
// event. It never touches storage directly. Every adapter goes through the port.
import {
  createEventCatalog, EventCatalogError, firstFieldError, postingDraftErrors,
  type CampusEvent, type CatalogFieldErrors, type EventCatalogPort, type EventDraft,
} from '../model/eventCatalog'
import { createBrowserEventTable, type CatalogStorage } from '../model/browserEventTable'
import { createSupabaseEventCatalogFromEnv } from '../model/supabaseEventTable'

export type { CampusEvent, CatalogFieldErrors, EventCatalogPort, EventDraft } from '../model/eventCatalog'

// ---------------------------------------------------------------------------
// Which catalog the app talks to. `shared` is false for the browser-only
// fallback, and the UI must say so on screen.
export type ConnectedCatalog = { catalog: EventCatalogPort; shared: boolean }

export function localEventCatalog(storage: CatalogStorage): ConnectedCatalog {
  return { catalog: createEventCatalog(createBrowserEventTable(storage)), shared: false }
}

export function connectEventCatalog(env: Readonly<Record<string, unknown>>, storage: CatalogStorage): ConnectedCatalog {
  const supabase = createSupabaseEventCatalogFromEnv(env)
  return supabase ? { catalog: supabase, shared: true } : localEventCatalog(storage)
}

// Acquire storage only inside guarded Model reads/writes. A blocked getter must
// never prevent a configured shared catalog from starting.
export function browserStorage(): CatalogStorage {
  return {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  }
}

export function connectBrowserEventCatalog(env: Readonly<Record<string, unknown>>): ConnectedCatalog {
  return connectEventCatalog(env, browserStorage())
}

export { postingDraftErrors, CATALOG_LIMITS, campusNow } from '../model/eventCatalog'
export { initialCampusWindow } from '../model/eventTiming'

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
    return { events: await catalog.listUpcoming(), error: null }
  } catch (error) {
    return { events: [], error: error instanceof EventCatalogError ? error.message : 'Could not load posted events.' }
  }
}
