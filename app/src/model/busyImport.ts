// MODEL: one port for busy time that comes from outside SideQuest.
// Google Calendar, a calendar file (.ics) and a typed or spoken sentence are three adapters
// behind the same shape. Every adapter's output passes the same check before the student sees it,
// and nothing is added until the student confirms.
import { isValidDate, toMinutes } from './events'

export type BusySourceKind = 'google' | 'ics' | 'sentence'

/** One stretch of busy time on one campus day (America/Los_Angeles), "HH:mm" to "HH:mm". */
export type BusyProposal = {
  date: string
  start: string
  end: string
  /** Shown in the confirm list only. Never stored: busy marks keep times, not titles. */
  label: string
  source: BusySourceKind
  /** False for things like all-day events, which the student ticks on if they mean it. */
  suggested: boolean
}

export type BusyImport = {
  proposals: BusyProposal[]
  /** Parts the adapter could not read with confidence, said back in plain words. */
  unclear: string[]
}

export type BusyRange = { from: string; to: string }

/** The port. Each adapter turns its own input into proposals for the days in `range`. */
export interface BusySource<Input> {
  readonly kind: BusySourceKind
  read(input: Input, range: BusyRange): Promise<BusyImport> | BusyImport
}

export const MAX_PROPOSALS = 60
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** The shared check. Drops anything malformed, outside the range, empty or reversed,
 *  merges exact duplicates, sorts by day and time and caps the list. */
export function checkProposals(list: readonly unknown[], range: BusyRange): BusyProposal[] {
  const seen = new Set<string>()
  const out: BusyProposal[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const p = raw as Record<string, unknown>
    if (typeof p.date !== 'string' || !isValidDate(p.date) || p.date < range.from || p.date > range.to) continue
    if (typeof p.start !== 'string' || typeof p.end !== 'string' || !HHMM.test(p.start) || !HHMM.test(p.end)) continue
    if ((toMinutes(p.end) ?? 0) <= (toMinutes(p.start) ?? 0)) continue
    const source = p.source === 'google' || p.source === 'ics' || p.source === 'sentence' ? p.source : null
    if (!source) continue
    const label = typeof p.label === 'string' ? p.label.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
    const key = `${p.date} ${p.start} ${p.end}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ date: p.date, start: p.start, end: p.end, label, source, suggested: p.suggested !== false })
  }
  out.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  return out.slice(0, MAX_PROPOSALS)
}

/** The campus days from `from`, `count` long, as YYYY-MM-DD. */
export function rangeOfDays(from: string, count: number): BusyRange {
  const d = new Date(from + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + Math.max(0, count - 1))
  return { from, to: d.toISOString().slice(0, 10) }
}
