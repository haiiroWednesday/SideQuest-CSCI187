// CONTROLLER: what the campus map is told about events. The map pins a venue
// only when its text names a place on the map; that matching happens in the map.
import { todayLocalISO, toMinutes } from '../model/events'
import { eventPhase } from '../model/eventTiming'
import type { CampusEvent } from './postEvent'
import { fitLineFor, presentDiscover } from './presentDiscover'
import { presentBrowseDetail, type StubModel } from './screenModels'

/** short: the marker label ("10am" today, "Tue 10am" later). at: sorts events in time order. posted: this browser posted it.
 *  fits: the whole event sits inside the student's free time (false while no free time is known). */
export type MapEventRow = { id: string; title: string; location: string; when: string; planned: boolean; posted: boolean; short: string; at: string; fits: boolean; ticket?: MapTicket }

/** A free stretch, as Discover filters by it. */
export type FreeStretch = { date: string; start: string; end: string }

/** What the map's event list needs to draw the same ticket as Discover: time stub, day, host. */
export type MapTicket = { time: string; ampm: string; endText: string; durationText: string; host: string | null; day: string }

const ticketOf = (stub: Pick<StubModel, 'start' | 'endText' | 'durationText' | 'host' | 'dow' | 'month' | 'dayNumber' | 'dayLabel'>): MapTicket => ({
  time: stub.start.time, ampm: stub.start.ampm, endText: stub.endText, durationText: stub.durationText,
  host: stub.host, day: stub.dayLabel ?? `${stub.dow.charAt(0)}${stub.dow.slice(1).toLowerCase()} ${stub.dayNumber}`,
})

const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24, mm = m % 60
  return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
}

export function whenText(event: Pick<CampusEvent, 'date' | 'start' | 'end'>, now: Date): string {
  const today = todayLocalISO(now)
  const tomorrow = todayLocalISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const [y, mo, d] = event.date.split('-').map(Number)
  const day = event.date === today ? 'Today' : event.date === tomorrow ? 'Tomorrow'
    : new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const start = toMinutes(event.start), end = toMinutes(event.end)
  return start === null ? day : `${day} · ${clock(start)}${end !== null ? `–${clock(end)}` : ''}`
}

export function shortWhen(event: Pick<CampusEvent, 'date' | 'start'>, now: Date): string {
  const start = toMinutes(event.start)
  const [y, mo, d] = event.date.split('-').map(Number)
  const day = event.date === todayLocalISO(now) ? '' : new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short' })
  return [day, start === null ? '' : clock(start)].filter(Boolean).join(' ') || 'Today'
}

/** The events Discover would keep for these free stretches, by the same code, so the map and the list never disagree. */
function fittingIds(events: readonly CampusEvent[], plannedIds: readonly string[], now: Date, free: readonly FreeStretch[]): Set<string> {
  return new Set(presentDiscover({ events, plannedIds, now, freeWindows: free }).days.flatMap(day => day.events.map(stub => stub.id)))
}

/**
 * Every event the map is told about: all upcoming events, as Discover lists them, plus your own
 * (posted or in My Schedule). Each says whether it fits the student's free time. `free` is null
 * while the student has said nothing about their time, and then nothing is marked as fitting.
 */
export function presentMapEvents(events: readonly CampusEvent[], plannedIds: readonly string[], now: Date, postedIds: readonly string[] = [], free: readonly FreeStretch[] | null = null): MapEventRow[] {
  const fitting = free ? fittingIds(events, plannedIds, now, free) : null
  return events
    .filter(e => eventPhase(e, now) !== 'ended' || plannedIds.includes(e.id) || postedIds.includes(e.id))
    .map(e => ({
      id: e.id, title: e.title, location: e.location, when: whenText(e, now),
      planned: plannedIds.includes(e.id), posted: postedIds.includes(e.id),
      short: shortWhen(e, now), at: `${e.date}T${e.start || '99:99'}`,
      fits: fitting?.has(e.id) ?? false,
      ticket: ticketOf(presentBrowseDetail(e, plannedIds, now)),
    }))
}

/** The map's "Fits my free time" filter: whether the chip is there, whether it starts pressed, and the count line it shows while on. */
export type MapFitFilter = { shown: boolean; on: boolean; line: string }

/**
 * Where the filter starts when the map opens.
 * - No free-time information: no chip, nothing filtered.
 * - Arriving for one venue ("Find it on the map", "Walk there"): off, so the event you came for is never hidden.
 * - Arriving from Discover's "See these on the map": on, when something fits.
 * - Otherwise the student's last choice this visit, and without one: on when at least one event fits.
 */
export function fitFilterStart(input: { hasFreeTime: boolean; fitCount: number; asked?: boolean; venueAsked?: boolean; choice?: boolean | null }): { shown: boolean; on: boolean } {
  if (!input.hasFreeTime) return { shown: false, on: false }
  if (input.venueAsked) return { shown: true, on: false }
  if (input.asked && input.fitCount > 0) return { shown: true, on: true }
  if (typeof input.choice === 'boolean') return { shown: true, on: input.choice }
  return { shown: true, on: input.fitCount > 0 }
}

// The student's own choice on the chip. Memory only, never storage: it lasts while they move
// around the app and a page reload starts fresh.
let fitChoice: boolean | null = null
export const readFitChoice = (): boolean | null => fitChoice
export const saveFitChoice = (on: boolean | null): void => { fitChoice = on }

/** Everything the map page is sent: the events, and its "Fits my free time" filter. */
export function presentMap(input: {
  events: readonly CampusEvent[]; plannedIds: readonly string[]; now: Date; postedIds?: readonly string[]
  /** The student's free stretches, or null while they have said nothing about their time. */
  free?: readonly FreeStretch[] | null
  /** Opened from Discover's "See these on the map". */
  fitAsked?: boolean
  /** Opened for one venue: "Find it on the map" or "Walk there". */
  venueAsked?: boolean
  choice?: boolean | null
}): { events: MapEventRow[]; fit: MapFitFilter } {
  const free = input.free ?? null
  const events = presentMapEvents(input.events, input.plannedIds, input.now, input.postedIds ?? [], free)
  const fitCount = events.filter(e => e.fits).length
  const start = fitFilterStart({ hasFreeTime: free !== null, fitCount, asked: input.fitAsked, venueAsked: input.venueAsked, choice: input.choice })
  // The same sentence Discover shows: "3 events fit your free time", or the nearest miss when nothing fits.
  const line = free ? fitLineFor(input.events.filter(e => eventPhase(e, input.now) !== 'ended'), fitCount, free) : ''
  return { events, fit: { ...start, line } }
}

/** Discover's link to the map with the filter on. */
export const MAP_FITS_ROUTE = '#map-fits'

type FitDay = { date: string; isToday: boolean; events: readonly { id: string; title: string; location: string; dow: string; dayNumber: number; start: { time: string; ampm: string }; endText: string; planned: boolean; fit: 'fits' | 'outside' | null; host?: string | null; durationText?: string; month?: string }[] }

/**
 * Discover's map mode: the events Discover lists that fit your free time (every listed event while
 * no free time is set). Events marked outside your free time stay off the map, so it never fills with pins.
 */
export function presentFitMap(days: readonly FitDay[]): MapEventRow[] {
  const title = (dow: string) => dow.charAt(0) + dow.slice(1).toLowerCase()
  return days.flatMap(day => day.events.filter(e => e.fit !== 'outside').map((e, i) => {
    const start = `${e.start.time}${e.start.ampm}`
    const dayText = day.isToday ? 'Today' : `${title(e.dow)} ${e.dayNumber}`
    return {
      id: e.id, title: e.title, location: e.location,
      when: `${dayText} · ${start}–${e.endText}`,
      planned: e.planned, posted: false, fits: e.fit === 'fits',
      short: day.isToday ? start : `${title(e.dow)} ${start}`,
      at: `${day.date}T${String(i).padStart(3, '0')}`,
      ...(e.durationText !== undefined ? { ticket: ticketOf({ start: e.start, endText: e.endText, durationText: e.durationText, host: e.host ?? null, dow: e.dow, month: e.month ?? '', dayNumber: e.dayNumber, dayLabel: day.isToday ? 'Today' : `${title(e.dow)} ${e.dayNumber}` }) } : {}),
    }
  }))
}
