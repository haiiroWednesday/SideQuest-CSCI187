// Domain timing uses the campus clock, independent of the viewer's timezone.
import { campusNow, isUpcoming } from './eventCatalog'
import { toMinutes, type LegacyCampusEvent } from './events'

// Timing depends only on fields shared by historical and current events.
export type TimedEvent = Pick<LegacyCampusEvent, 'id' | 'date' | 'start' | 'end'>

export function eventPhase(event: TimedEvent, now: Date): 'future' | 'live' | 'ended' {
  if (!isUpcoming(event, now)) return 'ended'
  const campus = campusNow(now)
  return event.date === campus.date && event.start <= campus.time ? 'live' : 'future'
}

export function minutesUntilStart(event: TimedEvent, now: Date): number {
  return (toMinutes(event.start) ?? 0) - (toMinutes(campusNow(now).time) ?? 0)
}

export function eventDuration(event: TimedEvent): number {
  return (toMinutes(event.end) ?? 0) - (toMinutes(event.start) ?? 0)
}

export function overlapSpan(a: TimedEvent, b: TimedEvent): { from: number; to: number } | null {
  if (a.id === b.id || a.date !== b.date) return null
  const startA = toMinutes(a.start),
    endA = toMinutes(a.end)
  const startB = toMinutes(b.start),
    endB = toMinutes(b.end)
  if (
    startA === null ||
    endA === null ||
    startB === null ||
    endB === null ||
    startA >= endA ||
    startB >= endB
  )
    return null
  const from = Math.max(startA, startB),
    to = Math.min(endA, endB)
  return from < to ? { from, to } : null
}

export function calendarDay(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day))
  return { year, month, day, weekday: value.getUTCDay(), ordinal: value.getTime() / 86_400_000 }
}

// Offer a window after the present moment, rounded to a quarter-hour.
const WINDOW_LEAD_MINUTES = 30
const WINDOW_ROUNDING_MINUTES = 15
const DEFAULT_WINDOW_DURATION_MINUTES = 60
const LAST_MINUTE_OF_DAY = 24 * 60 - 1

export function initialCampusWindow(now: Date): { date: string; start: string; end: string } {
  const campus = campusNow(now)
  const start =
    Math.ceil(((toMinutes(campus.time) ?? 0) + WINDOW_LEAD_MINUTES) / WINDOW_ROUNDING_MINUTES) *
    WINDOW_ROUNDING_MINUTES
  const hhmm = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  if (start + DEFAULT_WINDOW_DURATION_MINUTES <= LAST_MINUTE_OF_DAY)
    return {
      date: campus.date,
      start: hhmm(start),
      end: hhmm(start + DEFAULT_WINDOW_DURATION_MINUTES),
    }
  const next = new Date((calendarDay(campus.date).ordinal + 1) * 86_400_000)
  return { date: next.toISOString().slice(0, 10), start: '14:30', end: '15:30' }
}
