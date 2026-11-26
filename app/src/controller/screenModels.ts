// CONTROLLER: share typed presentation models and event/date formatters.
// Clock-sensitive presenters accept injected time for deterministic tests.
import { EVENT_SOURCE_TEXT, TAG_SOURCE_TEXT, isEventSource, isEventTag, isTagSource, tagLabel } from '../model/eventTags'
import { clockText, toMinutes, type LegacyCampusEvent } from '../model/events'
import { attendOf } from '../model/attend'
import type { EventCategorySelection } from '../model/eventCategories'
import { campusNow } from '../model/eventCatalog'
import { calendarDay, eventDuration, eventPhase, minutesUntilStart } from '../model/eventTiming'
import { displayDate, displayTime } from './findEvents'
import { googleCalendarDraftUrl } from './calendarExport'
import type { FitMarkModel } from './presentFitMark'

/** Keep archived M1 screen fixtures, which lack hostName, readable. */
export type ScreenEvent = LegacyCampusEvent & { hostName?: string; organizer?: string; contact?: string; accessibility?: string; tags?: readonly string[]; tagsBy?: string; source?: string }
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
  /** SCU posting policy fields; null on events posted before the rule. */
  organizer: string | null
  contact: string | null
  /** SCU's Access Policy Statement, shown word for word. */
  accessibility: string | null
  /** Host-set tags as words to show ("Free food"); left out when the event has none. */
  tagLabels?: string[]
  /** Who set the tags, said beside them: "set by the host" or "checked by a reviewer". */
  tagSourceText?: string
  /** Where the event came from, for the opened card: "Posted by the host", "From SCU's events calendar, checked". */
  sourceText?: string
  date: string
  dateText: string
  /** The day said on a ticket that sits off the day list (Groups, Someday, the map): "Today", "Tomorrow", "Thu 26". */
  dayLabel?: string
  dow: string
  dayNumber: number
  month: string
  start: TimeParts
  endText: string
  durationText: string
  /** Only on a drop-in event (the host said "Drop in any time"). `label` stands where a set-time
   *  ticket shows its length, `name` is added to the ticket's accessible name, and `line` is the
   *  opened card's sentence: "Drop in any time between 11am and 3pm." */
  dropIn?: { label: string; name: string; line: string }
  calendarUrl?: string | null
  planned: boolean
  /** null while no complete, valid free-time window is set */
  fit: 'fits' | 'outside' | null
  /** a clock-driven note: the event is under way, or starts within the hour */
  live: { kind: 'now' | 'soon'; text: string } | null
  /** The event's own start and end as "HH:mm", for presenters that measure it against free time. */
  clock?: { start: string; end: string }
  /** The fit mark: the free stretch around the event and where the event sits in it.
   *  Left out when nothing is known about the student's time that day. */
  fitMark?: FitMarkModel
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

export type CategoryFiltersModel = {
  selected: EventCategorySelection
  options: { id: EventCategorySelection; label: string; symbol: string; count: number }[]
}

export type TagFiltersModel = { selected: string[]; options: { id: string; label: string; count: number }[] }
export type DiscoverScreen = {
  status: 'loading' | 'error' | 'empty' | 'ready'
  errorMessage: string | null
  days: (DayModel & { events: StubModel[] })[]
  count: number
  headingText: string
  nearMisses: NearMissModel[]
  /** One line under the day bar once free stretches filter the list: how many fit, or the nearest miss. */
  fitLine?: string | null
  categories: CategoryFiltersModel
  /** Host-set tag chips; optional so older screen fixtures stay valid. */
  tagFilters?: TagFiltersModel
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

const capitalize = (word: string) => word.charAt(0) + word.slice(1).toLowerCase()
/** Today, Tomorrow, or a short weekday and date ("Thu 26", "Tue 1 Dec" in another month). */
export function dayLabelOf(day: DayModel): string {
  if (day.tag === 'TODAY') return 'Today'
  if (day.tag === 'TOMORROW') return 'Tomorrow'
  return `${capitalize(day.dow)} ${day.dayNumber}${day.monthTag ? ` ${capitalize(day.monthTag)}` : ''}`
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
    organizer: event.organizer?.trim() || null,
    contact: event.contact?.trim() || null,
    accessibility: event.accessibility?.trim() || null,
    ...(event.tags?.some(isEventTag) ? {
      tagLabels: event.tags.filter(isEventTag).map(tagLabel),
      tagSourceText: TAG_SOURCE_TEXT[isTagSource(event.tagsBy) ? event.tagsBy : 'host'],
    } : {}),
    sourceText: EVENT_SOURCE_TEXT[isEventSource(event.source) ? event.source : 'host'],
    date: event.date,
    dateText: displayDate(event.date),
    dayLabel: dayLabelOf(day),
    dow: day.dow,
    dayNumber: day.dayNumber,
    month: MONTHS[partsOf(event.date).month - 1] ?? '',
    start: splitTime(event.start),
    endText: displayTime(event.end),
    durationText: spanText(eventDuration(event)),
    ...dropInWords(event),
    calendarUrl: googleCalendarDraftUrl({
      id: event.id, title: event.title, description: event.description ?? '',
      location: event.location, date: event.date, start: event.start, end: event.end,
    }),
    planned: planned.has(event.id),
    fit: fitting ? (fitting.has(event.id) ? 'fits' : 'outside') : null,
    live: liveNote(event, now),
    clock: { start: event.start, end: event.end },
  }
}

/** The words a drop-in event carries. Nothing for an event that starts at a set time. */
function dropInWords(event: ScreenEvent): Pick<StubModel, 'dropIn'> {
  if (attendOf(event) !== 'dropin') return {}
  const start = toMinutes(event.start), end = toMinutes(event.end)
  return { dropIn: {
    label: 'Drop in', name: 'drop in any time',
    line: start === null || end === null ? 'Drop in any time.' : `Drop in any time between ${clockText(start)} and ${clockText(end)}.`,
  } }
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

