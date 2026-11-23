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
