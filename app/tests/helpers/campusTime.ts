// Build the instant when the Santa Clara clock reads `date` `time`, whatever
// time zone the test machine uses (CI runs in UTC). Pacific time is UTC-7 or UTC-8.
import { campusNow } from '../../src/model/eventCatalog'

export function campusAt(date: string, time: string): Date {
  for (const offset of ['-07:00', '-08:00']) {
    const candidate = new Date(`${date}T${time}:00${offset}`)
    const campus = campusNow(candidate)
    if (campus.date === date && campus.time === time) return candidate
  }
  throw new Error(`No campus instant for ${date} ${time}`)
}

/** Run `fn` with the process pretending to be in another time zone. */
// Node re-reads TZ when it changes; tests run in Node, so reach it without Node's type package.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env

export function inTimeZone<T>(zone: string, fn: () => T): T {
  const saved = env.TZ
  env.TZ = zone
  try { return fn() } finally { if (saved === undefined) delete env.TZ; else env.TZ = saved }
}
