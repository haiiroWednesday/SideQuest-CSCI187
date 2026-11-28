// CONTROLLER: notes that help a student act on a fit. Strict full fit (findEvents) stays the
// only rule for what fits; nothing here adds or removes a fitting event.
//   leaveNotes  "Leave by 1:42pm for Chem lab", or "6 min late to Chem lab"
//   onePick     one recommended event per free stretch, with a one-line reason
//   planStretch two or more fitting events chained with walks between them, never overlapping
// Walks come from the campus map's path graph and are always labelled an estimate.
import { walkBetween, WALK_ESTIMATE_LABEL } from '../model/walkEstimate'
import { clockText, toMinutes } from '../model/events'

export type TimedPlace = { id: string; title: string; location: string; date: string; start: string; end: string }
export type Window = { date: string; start: string; end: string }

const toMin = (t: string) => toMinutes(t) ?? NaN
/** The model's one 12-hour clock ("5pm", "4:52pm"), for minutes that may run past midnight. */
export function clock(minutes: number): string {
  return clockText(((minutes % 1440) + 1440) % 1440)
}

/** Show "Leave by" only when you'd have this many minutes or fewer to spare after the event. */
export const LEAVE_BY_WITHIN = 20

export type LeaveNote =
  | { kind: 'leave-by'; text: string; at: string; to: string; walkMinutes: number }
  | { kind: 'late-next'; text: string; lateMinutes: number; to: string; walkMinutes: number }
  | { kind: 'late-start'; text: string; lateMinutes: number; from: string; walkMinutes: number }

/** The plans on the event's day just before and just after it (other events only). */
export function neighbours(event: TimedPlace, plans: readonly TimedPlace[]) {
  const sameDay = plans.filter(plan => plan.id !== event.id && plan.date === event.date)
  const before = sameDay.filter(plan => toMin(plan.end) <= toMin(event.start))
    .sort((a, b) => toMin(b.end) - toMin(a.end))[0] ?? null
  const after = sameDay.filter(plan => toMin(plan.start) >= toMin(event.end))
    .sort((a, b) => toMin(a.start) - toMin(b.start))[0] ?? null
  return { before, after }
}

/**
 * Walking notes for one event against My Schedule. Only places on the map count:
 * an unknown place gives no note, never a guess.
 */
export function leaveNotes(event: TimedPlace, plans: readonly TimedPlace[]): { notes: LeaveNote[]; label: string } {
  const { before, after } = neighbours(event, plans)
  const notes: LeaveNote[] = []
  if (before) {
    const walk = walkBetween(before.location, event.location)
    if (walk.status === 'ready' && walk.minutes > 0) {
      const late = toMin(before.end) + walk.minutes - toMin(event.start)
      if (late > 0) notes.push({ kind: 'late-start', lateMinutes: late, from: before.title, walkMinutes: walk.minutes,
        text: `${late} min late from ${before.title}` })
    }
  }
  if (after) {
    const walk = walkBetween(event.location, after.location)
    if (walk.status === 'ready' && walk.minutes > 0) {
      const leaveAt = toMin(after.start) - walk.minutes
      // "Leave by" helps only when the next plan is close behind; hours later it is noise.
      if (leaveAt >= toMin(event.end) && leaveAt - toMin(event.end) > LEAVE_BY_WITHIN) {
        // plenty of time: no note
      } else if (leaveAt >= toMin(event.end)) {
        notes.push({ kind: 'leave-by', at: clock(leaveAt), to: after.title, walkMinutes: walk.minutes,
          text: `Leave by ${clock(leaveAt)} for ${after.title}, ${walk.minutes} min walk` })
      } else {
        const late = toMin(event.end) - leaveAt
        notes.push({ kind: 'late-next', lateMinutes: late, to: after.title, walkMinutes: walk.minutes,
          text: `${late} min late to ${after.title}` })
      }
    }
  }
  return { notes, label: WALK_ESTIMATE_LABEL }
}

export type Pick = { event: TimedPlace; reason: string }

/**
 * One recommended event for a free stretch (Conventus: one good suggestion beats a flood).
 * Only events that already fit the stretch are passed in. Ranked by the walk from where you'll be
 * (the plan just before the stretch, when it is on the map), then by the earliest start.
 */
export function onePick(fitting: readonly TimedPlace[], window: Window, plans: readonly TimedPlace[]): Pick | null {
  const inside = fitting.filter(e => e.date === window.date && toMin(e.start) >= toMin(window.start) && toMin(e.end) <= toMin(window.end))
  if (!inside.length) return null
  const from = plans.filter(p => p.date === window.date && toMin(p.end) <= toMin(window.start))
    .sort((a, b) => toMin(b.end) - toMin(a.end))[0] ?? null
  const walkOf = (e: TimedPlace) => {
    if (!from) return null
    const w = walkBetween(from.location, e.location)
    return w.status === 'ready' ? w.minutes : null
  }
  const ranked = inside.map(event => ({ event, walk: walkOf(event) })).sort((a, b) =>
    (a.walk ?? Infinity) - (b.walk ?? Infinity) || toMin(a.event.start) - toMin(b.event.start) || a.event.title.localeCompare(b.event.title))
  const best = ranked[0]
  const soonest = Math.min(...inside.map(e => toMin(e.start)))
  const startsFirst = toMin(best.event.start) === soonest
  let reason: string
  if (best.walk !== null && from) {
    // Measured from the plan before this free time, and said so: "closest to you" would sound like location tracking.
    const walk = best.walk === 0 ? `Same building as ${from.title}` : `${best.walk} min walk from ${from.title}`
    reason = startsFirst && inside.length > 1 ? `Starts first. ${walk}` : walk
  } else {
    reason = inside.length > 1 ? 'Starts first in this free time' : 'The one event that fits this free time'
  }
  return { event: best.event, reason }
}

export type Stop = { event: TimedPlace; walkBefore: number | null }
export type StretchPlan = { stops: Stop[]; label: string; minutes: number }

/**
 * Plan my afternoon (Odyssey's day route, inside one free stretch): the longest chain of fitting
 * events where each one starts after the last ends plus the walk between them. Unknown walks only
 * chain inside the same place. Ties go to more time at events, then the earlier finish.
 */
export function planStretch(fitting: readonly TimedPlace[], window: Window): StretchPlan | null {
  const items = fitting
    .filter(e => e.date === window.date && toMin(e.start) >= toMin(window.start) && toMin(e.end) <= toMin(window.end))
    .sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end) || a.id.localeCompare(b.id))
  const gap = (a: TimedPlace, b: TimedPlace): number | null => {
    const w = walkBetween(a.location, b.location)
    if (w.status === 'ready') return w.minutes
    return a.location.trim().toLowerCase() === b.location.trim().toLowerCase() ? 0 : null
  }
  type Best = { count: number; minutes: number; finish: number; prev: number; walk: number | null }
  const best: Best[] = items.map(e => ({ count: 1, minutes: toMin(e.end) - toMin(e.start), finish: toMin(e.end), prev: -1, walk: null }))
  const better = (a: Omit<Best, 'prev' | 'walk'>, b: Omit<Best, 'prev' | 'walk'>) =>
    a.count !== b.count ? a.count > b.count : a.minutes !== b.minutes ? a.minutes > b.minutes : a.finish < b.finish
  for (let j = 0; j < items.length; j++) {
    for (let i = 0; i < j; i++) {
      const walk = gap(items[i], items[j])
      if (walk === null || toMin(items[i].end) + walk > toMin(items[j].start)) continue
      const candidate = { count: best[i].count + 1, minutes: best[i].minutes + toMin(items[j].end) - toMin(items[j].start), finish: toMin(items[j].end) }
      if (better(candidate, best[j])) best[j] = { ...candidate, prev: i, walk }
    }
  }
  let end = -1
  best.forEach((b, i) => { if (end < 0 || better(b, best[end])) end = i })
  if (end < 0 || best[end].count < 2) return null
  const stops: Stop[] = []
  for (let i = end; i >= 0; i = best[i].prev) stops.unshift({ event: items[i], walkBefore: best[i].walk })
  return { stops, label: WALK_ESTIMATE_LABEL, minutes: best[end].minutes }
}
