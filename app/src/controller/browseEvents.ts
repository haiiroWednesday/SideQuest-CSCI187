import type { CampusEvent } from '../model/events'

// Keep the M1 model unchanged while requiring the additional M2 catalog fields.
export type CatalogEvent = CampusEvent & {
  hostName: string
  description: string
}

export interface EventCatalogPort {
  listUpcoming(): Promise<CatalogEvent[]>
  getById(id: string): Promise<CatalogEvent | null>
}

export function loadUpcomingEvents(catalog: EventCatalogPort): Promise<CatalogEvent[]> {
  return catalog.listUpcoming()
}

export function loadEventDetails(catalog: EventCatalogPort, id: string): Promise<CatalogEvent | null> {
  return catalog.getById(id)
}
