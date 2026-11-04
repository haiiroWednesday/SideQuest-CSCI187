// 🧪 TEST FIXTURE: an in-memory EventTable. It is NOT shared persistence.
// Every browser tab gets its own empty copy, and everything is lost on reload.
// Use it in unit tests and in UI work before Supabase is configured. Never
// present it as the public catalog in the demo.
//
// It behaves like the Postgres table: the store assigns UUIDs, and reads
// return copies with HH:mm:ss times, the way Postgres returns `time` values.
import type { EventRow, EventTable, NewEventRow } from './eventCatalog'

export type InMemoryEventTable = EventTable & {
  // The rows as stored. Tests can inspect them or share them between
  // two catalog instances to imitate two browsers on one database.
  readonly rows: Map<string, EventRow>
}

const withSeconds = (time: string) => (time.length === 5 ? `${time}:00` : time)

export function createInMemoryEventTable(
  rows: Map<string, EventRow> = new Map(),
  newId: () => string = () => crypto.randomUUID(),
): InMemoryEventTable {
  return {
    rows,
    async insert(row: NewEventRow) {
      const id = newId()
      // A real primary key rejects a reused ID instead of overwriting the row.
      if (rows.has(id)) throw new Error(`duplicate key value violates unique constraint "events_pkey" (${id})`)
      const stored: EventRow = { ...row, id, start_time: withSeconds(row.start_time), end_time: withSeconds(row.end_time) }
      rows.set(id, stored)
      return { ...stored }
    },
    async selectFromDate(date: string) {
      return [...rows.values()].filter(row => row.event_date >= date).map(row => ({ ...row }))
    },
    async selectById(id: string) {
      const row = rows.get(id)
      return row ? { ...row } : null
    },
  }
}
