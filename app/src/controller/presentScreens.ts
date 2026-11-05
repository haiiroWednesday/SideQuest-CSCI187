// CONTROLLER: turn catalog events, planned IDs and the device clock into
// exactly what the Discover and My Schedule views draw. Views receive these
// screen objects and never compare dates or times, read the clock, or import
// the Model. Every function takes `now` so tests can move the clock.
import { type CampusEvent } from '../model/events'
import { campusNow } from '../model/eventCatalog'
import { calendarDay, eventDuration, eventPhase, minutesUntilStart, overlapSpan } from '../model/eventTiming'
import { displayDate, displayTime, findEvents } from './findEvents'

/** M2 events carry a hostName; M1 events in this branch may not. */
export type ScreenEvent = CampusEvent & { hostName?: string }
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

export type DiscoverScreen = {
  status: 'loading' | 'error' | 'empty' | 'ready'
  errorMessage: string | null
  days: (DayModel & { events: StubModel[] })[]
  count: number
  headingText: string
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
  const t = partsOf(today)
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
    monthTag: month !== t.month || year !== t.year ? MONTHS[month - 1] ?? null : null,
  }
}

function liveNote(event: CampusEvent, now: Date): StubModel['live'] {
  if (event.date !== campusNow(now).date) return null
  const phase = eventPhase(event, now)
  if (phase === 'live') return { kind: 'now', text: `Happening now · until ${displayTime(event.end)}` }
  const until = minutesUntilStart(event, now)
  if (phase === 'future' && until > 0 && until <= SOON_MINUTES) return { kind: 'soon', text: `Starts in ${spanText(until)}` }
  return null
}

function toStub(event: ScreenEvent, now: Date, planned: ReadonlySet<string>, fitting: ReadonlySet<string> | null): StubModel {
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
    planned: planned.has(event.id),
    fit: fitting ? (fitting.has(event.id) ? 'fits' : 'outside') : null,
    live: liveNote(event, now),
  }
}

/** Present a freshly verified Event with the same display contract as Discover. */
export function presentBrowseDetail(event: ScreenEvent, plannedIds: readonly string[] = [], now: Date = new Date()): StubModel {
  return toStub(event, now, new Set(plannedIds), null)
}

function byTime(a: CampusEvent, b: CampusEvent): number {
  return a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.id.localeCompare(b.id)
}

function groupDays<T extends { date: string }>(items: T[], now: Date): (DayModel & { events: T[] })[] {
  const days: (DayModel & { events: T[] })[] = []
  for (const item of items) {
    const last = days[days.length - 1]
    if (last && last.date === item.date) last.events.push(item)
    else days.push({ ...describeDay(item.date, now), events: [item] })
  }
  return days
}

// ---------- Discover

export function presentDiscover(input: {
  events: readonly ScreenEvent[]
  loading?: boolean
  error?: string | null
  plannedIds?: readonly string[]
  planningBlocked?: boolean
  /** pass a window to show the "When are you free?" row; omit to hide it */
  freeWindow?: FreeWindow
  now?: Date
}): DiscoverScreen {
  const now = input.now ?? new Date()
  const planned = new Set(input.plannedIds ?? [])
  const plannedCount = planned.size

  // An open tab outlives events: drop anything that has ended since the catalog was read.
  const upcoming = input.events.filter(event => eventPhase(event, now) !== 'ended').sort(byTime)

  let freeWindow: FreeWindowModel | null = null
  let fitting: Set<string> | null = null
  if (input.freeWindow) {
    const values = input.freeWindow
    const complete = Boolean(values.date && values.start && values.end)
    const search = complete ? findEvents(upcoming, values.date, values.start, values.end) : null
    if (search && !search.error) fitting = new Set(search.matches.map(event => event.id))
    const fitCount = fitting ? fitting.size : null
    freeWindow = {
      values,
      active: fitting !== null,
      fitCount,
      fitText: fitCount === null ? null : fitCount === 0 ? 'Nothing fits' : `${fitCount} fit`,
      hint: !complete && Boolean(values.date || values.start || values.end)
        ? 'Showing all upcoming events. Complete the date and both times to filter.' : null,
      error: search?.error ?? null,
      canClear: Boolean(values.date || values.start || values.end),
    }
  }

  const base = { plannedCount, freeWindow, planningBlocked: Boolean(input.planningBlocked) }
  if (input.loading) return { ...base, status: 'loading', errorMessage: null, days: [], count: 0, headingText: 'Coming up' }
  if (input.error) return { ...base, status: 'error', errorMessage: input.error, days: [], count: 0, headingText: 'Coming up' }
  if (upcoming.length === 0) return { ...base, status: 'empty', errorMessage: null, days: [], count: 0, headingText: 'Coming up' }

  const visible = fitting ? upcoming.filter(event => fitting.has(event.id)) : upcoming
  const stubs = visible.map(event => toStub(event, now, planned, fitting))
  return {
    ...base,
    status: 'ready',
    errorMessage: null,
    days: groupDays(stubs, now),
    count: stubs.length,
    headingText: `Coming up, ${stubs.length} ${stubs.length === 1 ? 'event' : 'events'}`,
  }
}

// ---------- My Schedule

/** The shape the Schedule controller already returns (entries with one representative conflict, plus IDs it could not find). */
export type ScheduleInput = {
  ids: readonly string[]
  entries: readonly { event: ScreenEvent; conflict: ScreenEvent | null }[]
  missingIds: readonly string[]
  blocked?: boolean
  loading?: boolean
  capacityMessage?: string | null
  unresolvedIds?: readonly string[]
}

export type PlanStubModel = StubModel & {
  overlap: { title: string; text: string } | null
  done: boolean
}

export type NextUpModel = {
  stub: PlanStubModel
  /** "in 1 hr 30 min", "Happening now", "Tomorrow at 3:00pm", "Sat 11/7 at 3:00pm" */
  when: string
  kind: 'now' | 'today' | 'tomorrow' | 'later'
}

export type ScheduleScreen = {
  status: 'empty' | 'ready' | 'blocked' | 'loading'
  plannedCount: number
  overlapCount: number
  missingCount: number
  nextUp: NextUpModel | null
  days: (DayModel & { events: PlanStubModel[]; overlapNote: string | null })[]
  done: PlanStubModel[]
  capacityMessage: string | null
  unresolved: { id: string }[]
  missing: { id: string }[]
}

export function presentSchedule(input: ScheduleInput, now: Date = new Date()): ScheduleScreen {
  const ids = new Set(input.entries.map(entry => entry.event.id))
  const sorted = [...input.entries].sort((a, b) => byTime(a.event, b.event))
  const stubs: PlanStubModel[] = sorted.map(({ event, conflict }) => {
    const span = conflict ? overlapSpan(event, conflict) : null
    return {
      ...toStub(event, now, ids, null),
      overlap: conflict && span ? { title: conflict.title, text: `Overlaps ${conflict.title} by ${spanText(span.to - span.from)}` } : null,
      done: eventPhase(event, now) === 'ended',
    }
  })
  const upcoming = stubs.filter(stub => !stub.done)
  const done = stubs.filter(stub => stub.done)
  const days = groupDays(upcoming, now).map(day => {
    const count = day.events.filter(event => event.overlap !== null).length
    const overlapNote = count ? `${count} plans have conflicts` : null
    return { ...day, overlapNote }
  })

  let nextUp: NextUpModel | null = null
  const first = upcoming[0]
  if (first) {
    const day = describeDay(first.date, now)
    const until = minutesUntilStart(sorted.find(entry => entry.event.id === first.id)!.event, now)
    nextUp = first.live?.kind === 'now'
      ? { stub: first, kind: 'now', when: first.live.text }
      : day.isToday
        ? { stub: first, kind: 'today', when: `in ${spanText(until)}` }
        : day.tag === 'TOMORROW'
          ? { stub: first, kind: 'tomorrow', when: `Tomorrow at ${first.start.time}${first.start.ampm}` }
          : { stub: first, kind: 'later', when: `${day.long.split(',')[0].slice(0, 3)} ${first.dateText.slice(0, -5)} at ${first.start.time}${first.start.ampm}` }
  }

  return {
    status: input.blocked ? 'blocked' : input.loading ? 'loading' : input.ids.length === 0 ? 'empty' : 'ready',
    plannedCount: input.ids.length,
    overlapCount: upcoming.filter(stub => stub.overlap).length,
    missingCount: input.missingIds.length,
    nextUp,
    days,
    done,
    capacityMessage: input.capacityMessage ?? null,
    unresolved: (input.unresolvedIds ?? []).map(id => ({ id })),
    missing: input.missingIds.map(id => ({ id })),
  }
}
