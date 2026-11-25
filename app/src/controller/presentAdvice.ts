// CONTROLLER: what Discover says around the fitting events. One pick and a short plan per free
// stretch, a "Leave by" or "you'd be late" note on fitting cards, and live food notices.
// The strict full-fit rule (findEvents) picks the events; nothing here widens or narrows it.
import { findEvents } from './findEvents'
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

export function presentStretchAdvice(input: {
  events: readonly ScreenEvent[]
  windows: readonly StretchWindow[]
  plannedIds: readonly string[]
  now: Date
}): StretchAdvice[] {
  const planned = new Set(input.plannedIds)
  const open = input.events.filter(e => !planned.has(e.id) && eventPhase(e, input.now) === 'future')
  const plans = input.events.filter(e => planned.has(e.id)).map(place)
  return input.windows.flatMap(window => {
    const found = findEvents(open, window.date, window.start, window.end)
    if (found.error || !found.matches.length) return []
    const fitting = found.matches.map(place)
    const pick = onePick(fitting, window, plans)
    if (!pick) return []
    const plan = planStretch(fitting, window)
    return [{
      id: `${window.date}-${window.start}`,
      label: window.label,
      count: fitting.length,
      pick: { id: pick.event.id, title: pick.event.title, time: `${displayTime(pick.event.start)} to ${displayTime(pick.event.end)}`, location: pick.event.location, reason: pick.reason },
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
    if (!event || planned.has(id)) continue
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

// For the App (a View): the food-notice rule and its type, without importing the Model directly.
export { postFoodNotice, type FoodNotice } from '../model/foodNow'
