// CONTROLLER: what the campus map is told about events. The map pins a venue
// only when its text names a place on the map; that matching happens in the map.
import { todayLocalISO, toMinutes } from '../model/events'
import type { CampusEvent } from './postEvent'

/** short: the marker label ("10am" today, "Tue 10am" later). at: sorts events in time order. posted: this browser posted it. */
export type MapEventRow = { id: string; title: string; location: string; when: string; planned: boolean; posted: boolean; short: string; at: string }

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

/** The map only shows your own events: the ones you posted and the ones in My Schedule. */
export function presentMapEvents(events: readonly CampusEvent[], plannedIds: readonly string[], now: Date, postedIds: readonly string[] = []): MapEventRow[] {
  return events
    .filter(e => plannedIds.includes(e.id) || postedIds.includes(e.id))
    .map(e => ({
      id: e.id, title: e.title, location: e.location, when: whenText(e, now),
      planned: plannedIds.includes(e.id), posted: postedIds.includes(e.id),
      short: shortWhen(e, now), at: `${e.date}T${e.start || '99:99'}`,
    }))
}

type FitDay = { date: string; isToday: boolean; events: readonly { id: string; title: string; location: string; dow: string; dayNumber: number; start: { time: string; ampm: string }; endText: string; planned: boolean; fit: 'fits' | 'outside' | null }[] }

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
      planned: e.planned, posted: false,
      short: day.isToday ? start : `${title(e.dow)} ${start}`,
      at: `${day.date}T${String(i).padStart(3, '0')}`,
    }
  }))
}
