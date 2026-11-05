// TEST FIXTURE: a disposable EventTable for isolated unit and browser tests.
// Assign IDs and return HH:mm:ss times to match the SQL adapter's contract.
import { toSqlTime, type EventRow, type EventTable, type NewEventRow } from './eventCatalog'

export type InMemoryEventTable = EventTable & {
  // The rows as stored. Tests can inspect them or share them between
  // two catalog instances to imitate two browsers on one database.
  readonly rows: Map<string, EventRow>
}

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
      const stored: EventRow = { ...row, id, start_time: toSqlTime(row.start_time), end_time: toSqlTime(row.end_time) }
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
