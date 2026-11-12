// Calendar-date arithmetic for real-time browser and Vitest fixtures.
// Use the campus date rather than the runner's local timezone.
import { campusNow } from '../../src/model/eventCatalog'

export function campusDateFromToday(days: number, now: Date = new Date()): string {
  const [year, month, day] = campusNow(now).date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}
