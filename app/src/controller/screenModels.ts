// CONTROLLER: share typed presentation models and event/date formatters.
// Clock-sensitive presenters accept injected time for deterministic tests.
import type { LegacyCampusEvent } from '../model/events'
import { campusNow } from '../model/eventCatalog'
import { calendarDay, eventDuration, eventPhase, minutesUntilStart } from '../model/eventTiming'
import { displayDate, displayTime } from './findEvents'
import { googleCalendarDraftUrl } from './calendarExport'

/** Keep archived M1 screen fixtures, which lack hostName, readable. */
export type ScreenEvent = LegacyCampusEvent & { hostName?: string }
export type FreeWindow = { date: string; start: string; end: string }

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const SOON_MINUTES = 60

export type TimeParts = { time: string; ampm: string }

export type StubModel = {
  id: string
  title: string
  host: string | null
  location: string
  description: string | null
  date: string
  dateText: string
  dow: string
  dayNumber: number
  month: string
  start: TimeParts
  endText: string
  durationText: string
  calendarUrl?: string | null
  planned: boolean
  /** null while no complete, valid free-time window is set */
  fit: 'fits' | 'outside' | null
  /** a clock-driven note: the event is under way, or starts within the hour */
  live: { kind: 'now' | 'soon'; text: string } | null
}

export type DayModel = {
  date: string
  /** TODAY, TOMORROW, a weekday within the week, IN 9 DAYS, or a date further out */
  tag: string
  long: string
  isToday: boolean
  dow: string
  dayNumber: number
  /** shown in the day bubble only when the month differs from today's */
  monthTag: string | null
}

export type FreeWindowModel = {
  values: FreeWindow
  /** true once all three parts are set and valid */
  active: boolean
  fitCount: number | null
  fitText: string | null
  hint: string | null
  error: string | null
  canClear: boolean
}

export type NearMissModel = {
  id: string
  title: string
  kind: 'overlap' | 'outside' | 'unknown'
  reason: string
}

export type DiscoverScreen = {
  status: 'loading' | 'error' | 'empty' | 'ready'
  errorMessage: string | null
  days: (DayModel & { events: StubModel[] })[]
  count: number
  headingText: string
  nearMisses: NearMissModel[]
  plannedCount: number
  planningBlocked: boolean
  freeWindow: FreeWindowModel | null
}

// ---------- shared pieces

function partsOf(date: string) {
  return calendarDay(date)
}

function dayGap(date: string, today: string): number {
  return calendarDay(date).ordinal - calendarDay(today).ordinal
}

export function splitTime(time: string): TimeParts {
  const shown = displayTime(time)
  return { time: shown.slice(0, -2), ampm: shown.slice(-2) }
}

export function spanText(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return [hours ? `${hours} hr` : '', mins ? `${mins} min` : ''].filter(Boolean).join(' ') || '0 min'
}

export function describeDay(date: string, now: Date): DayModel {
  const today = campusNow(now).date
  const { year, month, day, weekday } = partsOf(date)
  const todayParts = partsOf(today)
  const gap = dayGap(date, today)
  const dow = WEEKDAYS[weekday] ?? ''
  const tag = gap === 0 ? 'TODAY'
    : gap === 1 ? 'TOMORROW'
      : gap >= 2 && gap <= 6 ? dow
        : gap >= 7 && gap <= 13 ? `IN ${gap} DAYS`
          : `${MONTHS[month - 1]} ${day}`
  return {
    date,
    tag,
    long: `${LONG_DAYS[weekday] ?? ''}, ${displayDate(date)}`,
    isToday: gap === 0,
    dow,
    dayNumber: day,
    monthTag: month !== todayParts.month || year !== todayParts.year ? MONTHS[month - 1] ?? null : null,
  }
}

function liveNote(event: ScreenEvent, now: Date): StubModel['live'] {
  if (event.date !== campusNow(now).date) return null
  const phase = eventPhase(event, now)
  if (phase === 'live') return { kind: 'now', text: `Happening now · until ${displayTime(event.end)}` }
  const until = minutesUntilStart(event, now)
  if (phase === 'future' && until > 0 && until <= SOON_MINUTES) return { kind: 'soon', text: `Starts in ${spanText(until)}` }
  return null
}

export function toStub(event: ScreenEvent, now: Date, planned: ReadonlySet<string>, fitting: ReadonlySet<string> | null): StubModel {
  const day = describeDay(event.date, now)
  const host = event.hostName?.trim() || null
  const description = event.description?.trim() || null
  return {
    id: event.id,
    title: event.title,
    host,
    location: event.location,
    description,
    date: event.date,
    dateText: displayDate(event.date),
    dow: day.dow,
    dayNumber: day.dayNumber,
    month: MONTHS[partsOf(event.date).month - 1] ?? '',
    start: splitTime(event.start),
    endText: displayTime(event.end),
    durationText: spanText(eventDuration(event)),
    calendarUrl: googleCalendarDraftUrl({
      id: event.id,
      title: event.title,
      description: event.description ?? '',
      location: event.location,
      date: event.date,
      start: event.start,
      end: event.end,
    }),
    planned: planned.has(event.id),
    fit: fitting ? (fitting.has(event.id) ? 'fits' : 'outside') : null,
    live: liveNote(event, now),
  }
}

/** Present a freshly verified Event with the same display contract as Discover. */
export function presentBrowseDetail(event: ScreenEvent, plannedIds: readonly string[] = [], now: Date = new Date()): StubModel {
  return toStub(event, now, new Set(plannedIds), null)
}

export function byTime(a: ScreenEvent, b: ScreenEvent): number {
  return a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.id.localeCompare(b.id)
}

export function groupDays<T extends { date: string }>(items: T[], now: Date): (DayModel & { events: T[] })[] {
  const days: (DayModel & { events: T[] })[] = []
  for (const item of items) {
    const last = days[days.length - 1]
    if (last && last.date === item.date) last.events.push(item)
    else days.push({ ...describeDay(item.date, now), events: [item] })
  }
  return days
}

