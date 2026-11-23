// A tiny read-only, versioned protocol shared by the Node server and browser.
import { isCatalogId } from './eventCatalog'

export type CatalogChanged = {
  type: 'catalog.changed'
  eventId: string
}

export function isCatalogChanged(value: unknown): value is CatalogChanged {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return item.type === 'catalog.changed' && typeof item.eventId === 'string' && isCatalogId(item.eventId)
}

// Outbound application port: posting is independent of WebSocket transport.
// A fake publisher or another notification adapter can implement the same contract.
export interface CatalogPublisherPort {
  publish(eventId: string): void
}
