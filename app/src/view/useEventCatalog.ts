// Keep the existing hook name for production callers while sharing one
// catalog-loading implementation with the standalone posting list.
import type { EventCatalogPort } from '../controller/postEvent'
import { useCatalogEvents } from './useCatalogEvents'

export function useEventCatalog(catalog: EventCatalogPort) {
  return useCatalogEvents(catalog)
}
