// MODEL: opening hours for campus places (dining, Malley), read from SCU's own pages.
// The data lives in public/map/hours.json so the standalone map page reads the same file.
// Rules (architecture v5.1): unknown hours stay unknown, never guessed; where SCU's pages
// contradict each other the day is "unclear" and SideQuest says so instead of picking one.
import data from '../../public/map/hours.json' with { type: 'json' }
import { campusNow } from './eventCatalog'

export type Interval = readonly [string, string] // "HH:mm", "24:00" is midnight, end < start runs past midnight
export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type HoursException = { from: string; to: string; hours?: readonly Interval[]; unclear?: boolean; note: string }
export type PlaceHours = {
  id: string; name: string; kind: 'dining' | 'recreation'
  /** The campus map label this venue sits in (walk estimates and map cards use it). */
  place: string; where: string
  /** A missing weekday means SCU has not posted hours for it. An empty list means closed. */
  week: Partial<Record<DayKey, readonly Interval[]>>
  exceptions: readonly HoursException[]
  source: { url: string; checkedAt: string; also?: string }
}

export const PLACE_HOURS: readonly PlaceHours[] = (data as unknown as { places: PlaceHours[] }).places
const DAYS: readonly DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MAX_LOOKAHEAD_DAYS = 7

/** What a day's hours are: real opening spans in minutes (end may pass 1440), closed, or not known. */
export type DayHours =
  | { kind: 'hours'; spans: readonly (readonly [number, number])[]; note?: string }
  | { kind: 'unknown'; note: string }
  | { kind: 'unclear'; note: string }

const minutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
export function weekdayOf(date: string): DayKey {
  const [y, m, d] = date.split('-').map(Number)
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}
const toSpans = (list: readonly Interval[]) => list.map(([a, b]) => {
  const start = minutes(a); let end = minutes(b)
  if (end <= start) end += 1440 // runs past midnight
  return [start, end] as const
})

export function hoursOn(place: PlaceHours, date: string): DayHours {
  const ex = place.exceptions.find(e => e.from <= date && date <= e.to)
  if (ex) {
    if (ex.unclear || !ex.hours) return { kind: 'unclear', note: ex.note }
    return { kind: 'hours', spans: toSpans(ex.hours), note: ex.note }
  }
  const week = place.week[weekdayOf(date)]
  if (!week) return { kind: 'unknown', note: `${place.name} hasn't posted hours for this day` }
  return { kind: 'hours', spans: toSpans(week) }
}

/** "7am", "8:30am", "noon", "midnight", "11:59pm". Minutes may pass 1440 (after midnight). */
export function clockLabel(total: number): string {
  const m = ((total % 1440) + 1440) % 1440
  if (m === 0) return 'midnight'
  if (m === 720) return 'noon'
  const h = Math.floor(m / 60), mm = m % 60
  return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`
}
const DAY_NAMES: Record<DayKey, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' }

export type OpenStatus =
  | { state: 'open'; closes: number; label: string } // closes: minutes from the start of `date`, may pass 1440
  | { state: 'closed'; label: string; opens?: { date: string; at: number } }
  | { state: 'unknown' | 'unclear'; label: string; note: string }

/** Open, closed or not known at a campus date and minute. */
export function statusAt(place: PlaceHours, date: string, minute: number): OpenStatus {
  // A span from yesterday that runs past midnight still counts this morning.
  const yesterday = hoursOn(place, addDays(date, -1))
  if (yesterday.kind === 'hours') {
    for (const [s, e] of yesterday.spans) if (e > 1440 && minute < e - 1440 && minute + 1440 >= s) {
      return { state: 'open', closes: e - 1440, label: `Open until ${clockLabel(e)}` }
    }
  }
  const today = hoursOn(place, date)
  if (today.kind === 'unknown') return { state: 'unknown', label: 'Hours not posted', note: today.note }
  if (today.kind === 'unclear') return { state: 'unclear', label: 'Hours unclear today', note: today.note }
  for (const [s, e] of today.spans) if (minute >= s && minute < e) {
    // Back-to-back spans (11 to 2:30, then 2:30 to 9) read as one opening.
    let end = e
    for (const [s2, e2] of today.spans) if (s2 === end) end = e2
    return { state: 'open', closes: end, label: `Open until ${clockLabel(end)}` }
  }
  return nextOpening(place, date, minute)
}

function nextOpening(place: PlaceHours, date: string, minute: number): OpenStatus {
  for (let i = 0; i <= MAX_LOOKAHEAD_DAYS; i++) {
    const d = addDays(date, i), day = hoursOn(place, d)
    // Never guess past a day whose hours are not known.
    if (day.kind !== 'hours') {
      if (i === 0) continue
      return { state: 'closed', label: 'Closed. Next hours not posted' }
    }
    const next = day.spans.map(([s]) => s).filter(s => i > 0 || s > minute).sort((a, b) => a - b)[0]
    if (next === undefined) continue
    const when = i === 0 ? '' : i === 1 ? 'tomorrow ' : `${DAY_NAMES[weekdayOf(d)]} `
    return { state: 'closed', label: `Closed, opens ${when}${clockLabel(next)}`, opens: { date: d, at: next } }
  }
  return { state: 'closed', label: 'Closed. Next hours not posted' }
}

/** Status at a real moment, read on the Santa Clara clock. */
export function statusNow(place: PlaceHours, now: Date = new Date()): OpenStatus {
  const { date, time } = campusNow(now)
  return statusAt(place, date, minutes(time))
}

/**
 * How long a place stays open from `minute` on `date`, in minutes, or 0 when it is closed
 * or its hours are not known. Used to suggest a place for a free stretch.
 */
export function openFor(place: PlaceHours, date: string, minute: number): number {
  const s = statusAt(place, date, minute)
  return s.state === 'open' ? s.closes - minute : 0
}

export const placesIn = (mapLabel: string) => PLACE_HOURS.filter(p => p.place === mapLabel)
