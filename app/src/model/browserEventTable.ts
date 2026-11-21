// BROWSER-ONLY ADAPTER: persist a local catalog when shared storage is absent.
// Local storage persists on this browser only; it does not sync between browser profiles or devices.
// Demonstrate a shared catalog using the configured server, not this fallback.
// This key is separate from the archived M1 event-storage key.
import { toSqlTime, type EventRow, type EventTable, type NewEventRow } from './eventCatalog'

export const LOCAL_CATALOG_KEY = 'sidequest.local-catalog.v1'

export type CatalogStorage = Pick<Storage, 'getItem' | 'setItem'>

function isEventRow(value: unknown): value is EventRow {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return [
    'id',
    'title',
    'host_name',
    'description',
    'location',
    'event_date',
    'start_time',
    'end_time',
  ].every(key => typeof row[key] === 'string')
}

// Throw on unreadable data instead of treating it as empty. The catalog then
// reports 'unavailable', and a later insert can never overwrite the damaged value.
function readRows(storage: CatalogStorage): EventRow[] {
  const saved = storage.getItem(LOCAL_CATALOG_KEY)
  if (saved === null) return []
  const parsed: unknown = JSON.parse(saved)
  if (!Array.isArray(parsed) || !parsed.every(isEventRow)) {
    throw new Error(`Unreadable data under ${LOCAL_CATALOG_KEY}; it was left untouched.`)
  }
  return parsed
}

export function createBrowserEventTable(
  storage: CatalogStorage,
  newId: () => string = () => crypto.randomUUID(),
): EventTable {
  return {
    async insert(row: NewEventRow) {
      // Read the latest rows on every insert, so a post from another tab is kept.
      const rows = readRows(storage)
      const id = newId()
      if (rows.some(existing => existing.id === id)) throw new Error(`Duplicate event ID ${id}`)
      const stored: EventRow = {
        ...row,
        id,
        start_time: toSqlTime(row.start_time),
        end_time: toSqlTime(row.end_time),
      }
      storage.setItem(LOCAL_CATALOG_KEY, JSON.stringify([...rows, stored]))
      return stored
    },
    async selectFromDate(date: string) {
      return readRows(storage).filter(row => row.event_date >= date)
    },
    async selectById(id: string) {
      return readRows(storage).find(row => row.id === id) ?? null
    },
  }
}
