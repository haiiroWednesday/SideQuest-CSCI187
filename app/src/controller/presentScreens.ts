// CONTROLLER: turn catalog events, planned IDs and the device clock into
// exactly what the Discover and My Schedule views draw. Views receive these
// screen objects and never compare dates or times, read the clock, or import
// the Model. Every function takes `now` so tests can move the clock.
//
// Time follows the agreed contract: event dates and times are Santa Clara
// wall-clock values, so "today", "now" and "has it ended" all come from the
// Model's campusNow() and isUpcoming(), whatever time zone the visitor is in.
import { toMinutes, type CampusEvent } from '../model/events'
import { campusNow, isUpcoming } from '../model/eventCatalog'
import { displayDate, displayTime, findEvents } from './findEvents'

/** Catalog events always carry hostName and description; M1 records may not. */
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
  /** "Thu 11/5, 2:00–4:00pm" once active */
  summary: string | null
  /** true while an active window is set but the student chose to see everything */
  showingAll: boolean
  error: string | null
  canClear: boolean
}

export type DiscoverScreen = {
  /** 'nomatch': a valid window is set, upcoming events exist, and none fits it */
  status: 'loading' | 'error' | 'empty' | 'nomatch' | 'ready'
  errorMessage: string | null
  days: (DayModel & { events: StubModel[] })[]
  count: number
  headingText: string
  plannedCount: number
  freeWindow: FreeWindowModel | null
}

// ---------- shared pieces

function partsOf(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day, value: new Date(year, month - 1, day) }
}

function dayGap(date: string, today: string): number {
  return Math.round((partsOf(date).value.getTime() - partsOf(today).value.getTime()) / 86400000)
}

/** Minutes after midnight on the campus clock. */
function nowMinutes(now: Date): number {
  return toMinutes(campusNow(now).time) ?? 0
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

function lengthOf(event: CampusEvent): number {
  return (toMinutes(event.end) ?? 0) - (toMinutes(event.start) ?? 0)
}

export function describeDay(date: string, now: Date): DayModel {
  const today = campusNow(now).date
  const { year, month, day, value } = partsOf(date)
  const t = partsOf(today)
  const gap = dayGap(date, today)
  const dow = WEEKDAYS[value.getDay()] ?? ''
  const tag = gap === 0 ? 'TODAY'
    : gap === 1 ? 'TOMORROW'
      : gap >= 2 && gap <= 6 ? dow
        : gap >= 7 && gap <= 13 ? `IN ${gap} DAYS`
          : `${MONTHS[month - 1]} ${day}`
  return {
    date,
    tag,
    long: `${LONG_DAYS[value.getDay()] ?? ''}, ${displayDate(date)}`,
    isToday: gap === 0,
    dow,
    dayNumber: day,
    monthTag: month !== t.month || year !== t.year ? MONTHS[month - 1] ?? null : null,
  }
}

function liveNote(event: CampusEvent, now: Date): StubModel['live'] {
  if (event.date !== campusNow(now).date) return null
  const at = nowMinutes(now)
  const start = toMinutes(event.start) ?? 0
  const end = toMinutes(event.end) ?? 0
  // isUpcoming() has already removed anything whose end time has arrived.
  if (start <= at && at < end) return { kind: 'now', text: `Happening now · until ${displayTime(event.end)}` }
  if (start > at && start - at <= SOON_MINUTES) return { kind: 'soon', text: `Starts in ${spanText(start - at)}` }
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
    durationText: spanText(lengthOf(event)),
    planned: planned.has(event.id),
    fit: fitting ? (fitting.has(event.id) ? 'fits' : 'outside') : null,
    live: liveNote(event, now),
  }
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
  /** pass a window to show the "When are you free?" row; omit to hide it */
  freeWindow?: FreeWindow
  /** with an active window, list every event instead of only the ones that fit */
  showAll?: boolean
  now?: Date
}): DiscoverScreen {
  const now = input.now ?? new Date()
  const planned = new Set(input.plannedIds ?? [])
  const plannedCount = planned.size

  // An open tab outlives events: drop anything that has ended since the catalog was read.
  const upcoming = input.events.filter(event => isUpcoming(event, now)).sort(byTime)

  let freeWindow: FreeWindowModel | null = null
  let fitting: Set<string> | null = null
  if (input.freeWindow) {
    const values = input.freeWindow
    const complete = Boolean(values.date && values.start && values.end)
    const search = complete ? findEvents(upcoming, values.date, values.start, values.end) : null
    if (search && !search.error) fitting = new Set(search.matches.map(event => event.id))
    const fitCount = fitting ? fitting.size : null
    const day = fitting ? describeDay(values.date, now) : null
    freeWindow = {
      values,
      active: fitting !== null,
      fitCount,
      fitText: fitCount === null ? null : fitCount === 0 ? 'Nothing fits' : `${fitCount} fit`,
      summary: day ? `${day.long.slice(0, 3)} ${displayDate(values.date).slice(0, -5)}, ${rangeText(toMinutes(values.start) ?? 0, toMinutes(values.end) ?? 0)}` : null,
      showingAll: fitting !== null && Boolean(input.showAll),
      error: search?.error ?? null,
      canClear: Boolean(values.date || values.start || values.end),
    }
  }

  const base = { plannedCount, freeWindow }
  if (input.loading) return { ...base, status: 'loading', errorMessage: null, days: [], count: 0, headingText: 'Coming up' }
  if (input.error) return { ...base, status: 'error', errorMessage: input.error, days: [], count: 0, headingText: 'Coming up' }
  if (upcoming.length === 0) return { ...base, status: 'empty', errorMessage: null, days: [], count: 0, headingText: 'Coming up' }

  // With an active window, show only what fits unless the student asked to see everything.
  const listed = fitting && !input.showAll ? upcoming.filter(event => fitting!.has(event.id)) : upcoming
  if (listed.length === 0) return { ...base, status: 'nomatch', errorMessage: null, days: [], count: 0, headingText: 'Nothing fits this window' }
  const stubs = listed.map(event => toStub(event, now, planned, fitting))
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
  capacityMessage?: string | null
}

export type OverlapModel = { id: string; title: string; when: string; length: string }

export type PlanStubModel = StubModel & {
  /** every other plan this one shares time with; the stub only says "Overlaps", the details list them all */
  overlaps: OverlapModel[]
  done: boolean
}

export type NextUpModel = {
  stub: PlanStubModel
  /** "in 1 hr 30 min", "Happening now", "Tomorrow at 3:00pm", "Sat 11/7 at 3:00pm" */
  when: string
  kind: 'now' | 'today' | 'tomorrow' | 'later'
}

export type ScheduleScreen = {
  /** 'loading' / 'catalogError': plans are safe, but event details could not be looked up yet */
  status: 'empty' | 'ready' | 'blocked' | 'loading' | 'catalogError'
  errorMessage: string | null
  /** the Schedule controller's limit notice, passed through as written */
  capacityMessage: string | null
  plannedCount: number
  overlapCount: number
  missingCount: number
  nextUp: NextUpModel | null
  days: (DayModel & { events: PlanStubModel[]; overlapNote: string | null })[]
  done: PlanStubModel[]
  missing: { id: string }[]
}

function overlapMinutes(a: CampusEvent, b: CampusEvent): { from: number; to: number } | null {
  if (a.date !== b.date) return null
  const from = Math.max(toMinutes(a.start) ?? 0, toMinutes(b.start) ?? 0)
  const to = Math.min(toMinutes(a.end) ?? 0, toMinutes(b.end) ?? 0)
  return from < to ? { from, to } : null
}

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function rangeText(from: number, to: number): string {
  const a = displayTime(clock(from))
  const b = displayTime(clock(to))
  return `${a.slice(-2) === b.slice(-2) ? a.slice(0, -2) : a}–${b}`
}

export function presentSchedule(
  input: ScheduleInput,
  now: Date = new Date(),
  /** the catalog read this schedule was resolved against */
  catalog: { loading?: boolean; error?: string | null } = {},
): ScheduleScreen {
  const ids = new Set(input.entries.map(entry => entry.event.id))
  const sorted = [...input.entries].sort((a, b) => byTime(a.event, b.event))
  // The Schedule controller flags each clashing plan with one representative conflict.
  // For the details, list every plan it shares time with, using the same
  // half-open rule (10:00-11:00 and 11:00-12:00 do not overlap).
  const stubs: PlanStubModel[] = sorted.map(({ event, conflict }) => {
    const overlaps = conflict === null ? [] : sorted.flatMap(({ event: other }) => {
      const span = other.id === event.id ? null : overlapMinutes(event, other)
      return span ? [{ id: other.id, title: other.title, when: rangeText(span.from, span.to), length: spanText(span.to - span.from) }] : []
    })
    return { ...toStub(event, now, ids, null), overlaps, done: !isUpcoming(event, now) }
  })
  const upcoming = stubs.filter(stub => !stub.done)
  const done = stubs.filter(stub => stub.done)
  const days = groupDays(upcoming, now).map(day => {
    const clashing = day.events.filter(stub => stub.overlaps.length > 0).length
    return { ...day, overlapNote: clashing ? `${clashing} plans overlap` : null }
  })

  let nextUp: NextUpModel | null = null
  const first = upcoming[0]
  if (first) {
    const day = describeDay(first.date, now)
    const start = toMinutes(sorted.find(entry => entry.event.id === first.id)!.event.start) ?? 0
    const at = nowMinutes(now)
    nextUp = first.live?.kind === 'now'
      ? { stub: first, kind: 'now', when: first.live.text }
      : day.isToday
        ? { stub: first, kind: 'today', when: `in ${spanText(start - at)}` }
        : day.tag === 'TOMORROW'
          ? { stub: first, kind: 'tomorrow', when: `Tomorrow at ${first.start.time}${first.start.ampm}` }
          : { stub: first, kind: 'later', when: `${day.long.split(',')[0].slice(0, 3)} ${first.dateText.slice(0, -5)} at ${first.start.time}${first.start.ampm}` }
  }

  return {
    // A plan can only be called unavailable once the catalog has answered.
    status: input.blocked ? 'blocked' : input.ids.length === 0 ? 'empty' : catalog.loading ? 'loading' : catalog.error ? 'catalogError' : 'ready',
    errorMessage: catalog.error ?? null,
    capacityMessage: input.capacityMessage ?? null,
    plannedCount: input.ids.length,
    overlapCount: upcoming.filter(stub => stub.overlaps.length > 0).length,
    missingCount: input.missingIds.length,
    nextUp,
    days,
    done,
    missing: input.missingIds.map(id => ({ id })),
  }
}
