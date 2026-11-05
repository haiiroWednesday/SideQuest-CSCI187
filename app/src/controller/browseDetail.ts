// CONTROLLER: re-check a selected event using its stable catalog ID.
// Reject stale, mismatched or malformed responses before enabling planning.
import {
  EventCatalogError, isCatalogEvent, type CampusEvent, type EventCatalogPort,
} from '../model/eventCatalog'
import { CatalogReadTimeoutError, readCatalogWithDeadline } from './catalogReads'

export type BrowseDetailResult =
  | { status: 'ready'; event: CampusEvent }
  | { status: 'missing' }
  | { status: 'error'; message: string }

export async function loadBrowseDetail(catalog: EventCatalogPort, id: string): Promise<BrowseDetailResult> {
  try {
    const event = await readCatalogWithDeadline(() => catalog.getById(id))
    if (event === null) return { status: 'missing' }
    // A malformed response, or a response for a different ID, cannot be
    // treated as confirmed details or used for a scheduling action.
    if (!isCatalogEvent(event) || event.id !== id) {
      return { status: 'error', message: 'The latest event details could not be verified. Please try again.' }
    }
    return { status: 'ready', event }
  } catch (error) {
    const message = error instanceof EventCatalogError || error instanceof CatalogReadTimeoutError
      ? error.message
      : 'Could not load this event. Please check your connection and try again.'
    return { status: 'error', message }
  }
}
