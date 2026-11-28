// Santa Clara wall-clock conversions for Google Calendar. Google answers
// free/busy in instants (RFC 3339); SideQuest stores busy time as a local
// date with HH:mm start and end on the same day.
export const CAMPUS_TIME_ZONE = 'America/Los_Angeles'
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

export type BusyBlock = { date: string; start: string; end: string }

const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

function local(ms: number) {
  const out: Record<string, string> = {}
  for (const p of parts.formatToParts(new Date(ms))) out[p.type] = p.value
  return {
    date: `${out.year}-${out.month}-${out.day}`,
    minutes: Number(out.hour) * 60 + Number(out.minute),
    seconds: Number(out.second),
  }
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE.test(value)) return false
  const ms = Date.parse(value + 'T00:00:00Z')
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value
}

/** The instant at which a Santa Clara calendar day begins (DST-safe). */
export function campusMidnight(date: string): number {
  const guess = Date.parse(date + 'T00:00:00Z')
  let instant = guess
  for (let i = 0; i < 3; i++) {
    const seen = local(instant)
    const seenUtc = Date.parse(seen.date + 'T00:00:00Z') + seen.minutes * 60_000 + seen.seconds * 1000
    instant += guess - seenUtc
  }
  return instant
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * DAY_MS).toISOString().slice(0, 10)
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * Splits Google busy instants into same-day local blocks inside [from, to].
 * Starts round down and ends round up to the minute; a block that reaches
 * midnight ends at 23:59 because SideQuest times stay on one day.
 */
export function busyToBlocks(busy: { start: string; end: string }[], from: string, to: string): BusyBlock[] {
  const rangeStart = campusMidnight(from)
  const rangeEnd = campusMidnight(addDays(to, 1))
  const blocks: BusyBlock[] = []
  for (const item of busy) {
    let start = Date.parse(item.start)
    const end = Math.min(Date.parse(item.end), rangeEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue
    start = Math.max(start, rangeStart)
    while (start < end) {
      const day = local(start)
      const nextMidnight = campusMidnight(addDays(day.date, 1))
      const pieceEnd = Math.min(end, nextMidnight)
      const startMin = day.minutes
      const endLocal = local(pieceEnd - 1)
      const endMin = pieceEnd >= nextMidnight ? 24 * 60 : endLocal.minutes + 1
      if (endMin > startMin) {
        blocks.push({ date: day.date, start: hhmm(startMin), end: hhmm(Math.min(endMin, 23 * 60 + 59)) })
      }
      start = pieceEnd
    }
  }
  blocks.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  return blocks.filter(b => b.start < b.end)
}
