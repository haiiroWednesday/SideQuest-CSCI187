// CONTROLLER: what Discover says around the fitting events. One pick and a short plan per free
// stretch, a "Leave by" or "you'd be late" note on fitting cards, and live food notices.
// The fit rule (findEvents) picks the events; nothing here widens or narrows it. That rule lets a
// drop-in event fit a stretch it only shares part of, so this file measures such an event by the
// part inside the stretch, which is when the student would be there.
import { findEvents } from './findEvents'
import { attendOf } from '../model/attend'
import { hhmmOf, toMinutes } from '../model/events'
import { displayTime } from './findEvents'
import { leaveNotes, onePick, planStretch, type TimedPlace } from './timeAdvice'
import { activeFoodNotices, isHappeningNow, minutesLeft, type FoodNotice } from '../model/foodNow'
import { eventPhase } from '../model/eventTiming'
import { WALK_ESTIMATE_LABEL } from '../model/walkEstimate'
import type { ScreenEvent } from './screenModels'

export type StretchWindow = { date: string; start: string; end: string; label: string }
export type StretchAdvice = {
  id: string
  label: string
  count: number
  pick: { id: string; title: string; time: string; location: string; reason: string }
  plan: { ids: string[]; stops: { id: string; title: string; time: string; walk: string | null }[] } | null
}

const place = (e: ScreenEvent): TimedPlace => ({ id: e.id, title: e.title, location: e.location, date: e.date, start: e.start, end: e.end })
const isDropIn = (e: ScreenEvent) => attendOf(e) === 'dropin'
/** A fitting event as the student would attend it in this stretch. A drop-in event that runs past
 *  the stretch is cut to the part inside it; `cut` says so. Every other event is unchanged. */
function inStretch(e: ScreenEvent, window: { start: string; end: string }): TimedPlace & { cut: boolean } {
  const from = toMinutes(window.start), to = toMinutes(window.end), start = toMinutes(e.start), end = toMinutes(e.end)
  if (!isDropIn(e) || from === null || to === null || start === null || end === null || (start >= from && end <= to)) return { ...place(e), cut: false }
  return { ...place(e), start: hhmmOf(Math.max(start, from)), end: hhmmOf(Math.min(end, to)), cut: true }
}

export function presentStretchAdvice(input: {
  events: readonly ScreenEvent[]
  windows: readonly StretchWindow[]
  plannedIds: readonly string[]
  now: Date
}): StretchAdvice[] {
  const planned = new Set(input.plannedIds)
  // A set-time event has to be still ahead. A drop-in event can also be picked while it is on.
  const open = input.events.filter(e => {
    const phase = eventPhase(e, input.now)
    return !planned.has(e.id) && (phase === 'future' || (phase === 'live' && isDropIn(e)))
  })
  const plans = input.events.filter(e => planned.has(e.id)).map(place)
  return input.windows.flatMap(window => {
    const found = findEvents(open, window.date, window.start, window.end)
    if (found.error || !found.matches.length) return []
    const fitting = found.matches.map(event => inStretch(event, window))
    const pick = onePick(fitting, window, plans)
    if (!pick) return []
    // A chain only holds events attended from start to end. A drop-in event that runs past the
    // stretch would clash in My Schedule with the stop after it, so it stays out of the chain.
    const plan = planStretch(fitting.filter(event => !event.cut), window)
    // The pick shows the event's own hours, as its ticket does. Its fit mark says how long you get.
    const own = found.matches.find(event => event.id === pick.event.id)!
    const openBefore = isDropIn(own) && own.start < window.start
    const reason = openBefore
      ? pick.reason.replace(/^Starts first\. /, '').replace(/^Starts first in this free time$/, 'Open when your free time starts')
      : pick.reason
    return [{
      id: `${window.date}-${window.start}`,
      label: window.label,
      count: fitting.length,
      pick: { id: own.id, title: own.title, time: `${displayTime(own.start)} to ${displayTime(own.end)}`, location: own.location, reason },
      plan: plan && {
        ids: plan.stops.map(stop => stop.event.id),
        stops: plan.stops.map(stop => ({
          id: stop.event.id, title: stop.event.title, time: displayTime(stop.event.start),
          walk: stop.walkBefore === null ? null : stop.walkBefore === 0 ? 'same building' : `${stop.walkBefore} min walk`,
        })),
      },
    }]
  })
}

/**
 * One walking note per fitting card, warnings first. Read with WALK_ESTIMATE_LABEL nearby:
 * the paths come from the campus map and are not checked on foot.
 */
export function presentLeaveNotes(input: { events: readonly ScreenEvent[]; fittingIds: Iterable<string>; plannedIds: readonly string[] }): Map<string, { text: string; warn: boolean }> {
  const planned = new Set(input.plannedIds)
  const plans = input.events.filter(e => planned.has(e.id)).map(place)
  const byId = new Map(input.events.map(e => [e.id, e]))
  const out = new Map<string, { text: string; warn: boolean }>()
  for (const id of input.fittingIds) {
    const event = byId.get(id)
    // No walking note for a drop-in event: the student picks when to arrive and when to leave.
    if (!event || planned.has(id) || isDropIn(event)) continue
    const { notes } = leaveNotes(place(event), plans)
    const note = notes.find(n => n.kind !== 'leave-by') ?? notes[0]
    if (note) out.set(id, { text: note.text, warn: note.kind !== 'leave-by' })
  }
  return out
}
export const LEAVE_NOTE_LABEL = WALK_ESTIMATE_LABEL

export type FoodNoticeModel = { eventId: string; title: string; location: string; minutesLeft: number }

/** Live "food now" notices for events running right now, newest first. Nothing for ended events. */
export function presentFoodNotices(input: { notices: readonly FoodNotice[]; events: readonly ScreenEvent[]; now: Date }): FoodNoticeModel[] {
  const byId = new Map(input.events.map(e => [e.id, e]))
  return activeFoodNotices(input.notices, input.now)
    .flatMap(notice => {
      const event = byId.get(notice.eventId)
      if (!event || !isHappeningNow(event, input.now)) return []
      return [{ notice, model: { eventId: event.id, title: event.title, location: event.location, minutesLeft: minutesLeft(notice, input.now) } }]
    })
    .sort((a, b) => b.notice.postedAt - a.notice.postedAt)
    .map(item => item.model)
}

/** Leftover food shows on the event's own ticket (Nov 27, C7). While a notice lasts, that ticket leads its day,
 *  newest notice first. Every other ticket keeps its place. */
export function foodFirst<D extends { events: readonly { id: string }[] }>(days: readonly D[], notices: readonly FoodNoticeModel[]): D[] {
  if (!notices.length) return [...days]
  const rank = new Map(notices.map((n, i) => [n.eventId, i]))
  return days.map(day => {
    if (!day.events.some(e => rank.has(e.id))) return day
    const lead = day.events.filter(e => rank.has(e.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
    return { ...day, events: [...lead, ...day.events.filter(e => !rank.has(e.id))] }
  })
}

// For the App (a View): the food-notice rule and its type, without importing the Model directly.
export { postFoodNotice, type FoodNotice } from '../model/foodNow'
