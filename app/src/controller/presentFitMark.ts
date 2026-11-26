// CONTROLLER: the fit mark on a ticket. One small bar that answers "does this fit my free time?"
// before the title is read: the free stretch in gold, the event inside it, and any part of the
// event that falls outside the stretch in red. The Model (fitMark.ts on top of assessEventFit)
// decides what fits and gives the minutes. This file turns them into the few words beside the
// bar, the sentence a screen reader says, and where each part of the bar sits. Views only draw it.
import { clockSpan, toMinutes } from '../model/events'
import { fitSpan, sharedOf } from '../model/fitMark'
import { MIN_DROP_IN_MINUTES } from '../model/fitAssessment'
import type { FitTimeRecord, FitWindow } from '../model/fitAssessment'
import { spanText, type DiscoverScreen } from './screenModels'

/** A piece of the bar, in percent of its width. */
export type FitPart = { left: number; width: number }
export type FitMarkModel = {
  kind: 'fits' | 'over' | 'outside'
  /** Present only for a drop-in event. Its words say what the student gets, and the part of the
   *  event outside the free time is drawn quietly, because leaving early is the point. */
  dropIn?: true
  /** A few plain words beside the bar: "Fits", "Fits exactly", "10 min spare", "35 min over", "30 min early",
   *  and for a drop-in event "Drop in 45 min" or "Only 15 min". */
  label: string
  /** The same fact as a sentence, for the mark's accessible name. */
  say: string
  /** Minutes after midnight. The free times are null when the event touches no free time. */
  freeStart: number | null
  freeEnd: number | null
  eventStart: number
  eventEnd: number
  /** The drawing: the free stretch, the part of the event inside it, and the parts outside it. */
  free: FitPart | null
  inside: FitPart | null
  outside: FitPart[]
}
/** One day's free stretches for the mark. `known` is false when the student has said nothing
 *  about the day (no plans, no busy or free marks), so its tickets carry no mark. */
export type FitDay = { date: string; known: boolean; windows: readonly FitWindow[] }

/** Under this much spare time the mark says how much. With an hour or more it only says "Fits". */
const TIGHT_MINUTES = 60

/** How an event misses a free stretch. Discover's fit line and the mark's spoken sentence share
 *  these words: "runs 35 min over", "starts 10 min before you're free",
 *  "runs 45 min longer than your free time". */
export function missText(early: number, over: number): string {
  return early && over ? `runs ${spanText(early + over)} longer than your free time`
    : over ? `runs ${spanText(over)} over` : `starts ${spanText(early)} before you're free`
}

/** How a drop-in event misses: the student is free for too little of it. Shared with the fit line. */
export function dropInMissText(shared: number): string {
  return `shares only ${spanText(shared)} with your free time`
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * The mark for one event against a day's free stretches.
 * `whenOutside` says what to do when the event touches no free stretch at all: 'say' draws the
 * whole event in red ("Not free then"), for a day the student has told us about. 'skip' gives null.
 */
export function presentFitMark(event: FitTimeRecord, windows: readonly FitWindow[], whenOutside: 'say' | 'skip' = 'skip'): FitMarkModel | null {
  const span = fitSpan(event, windows)
  if (!span) {
    if (whenOutside === 'skip') return null
    const eventStart = toMinutes(event.start), eventEnd = event.end ? toMinutes(event.end) : null
    if (eventStart === null || eventEnd === null || eventEnd <= eventStart) return null
    return {
      kind: 'outside', label: 'Not free then', say: 'Not free then. It is outside your free time.',
      freeStart: null, freeEnd: null, eventStart, eventEnd,
      free: null, inside: null, outside: [{ left: 0, width: 100 }],
    }
  }
  const { freeStart, freeEnd, eventStart, eventEnd, early, over, spare } = span
  // The bar runs from the earliest minute shown to the latest, so every part is to scale.
  const from = Math.min(freeStart, eventStart), to = Math.max(freeEnd, eventEnd)
  const at = (minute: number) => Math.round(((minute - from) / (to - from)) * 1000) / 10
  const part = (a: number, b: number): FitPart => ({ left: at(a), width: Math.round((at(b) - at(a)) * 10) / 10 })
  const drawing = {
    freeStart, freeEnd, eventStart, eventEnd,
    free: part(freeStart, freeEnd),
    inside: part(Math.max(eventStart, freeStart), Math.min(eventEnd, freeEnd)),
    outside: [...(early ? [part(eventStart, freeStart)] : []), ...(over ? [part(freeEnd, eventEnd)] : [])],
  }
  const free = clockSpan(freeStart, freeEnd)
  if (span.dropIn) {
    // What the student gets: the minutes the event and the free time share, never more than the event.
    const shared = sharedOf(span)
    if (span.kind === 'fits') return { kind: 'fits', dropIn: true, label: `Drop in ${spanText(shared)}`, say: `Drop in for up to ${spanText(shared)} of your free time, ${free}.`, ...drawing }
    return { kind: 'over', dropIn: true, label: `Only ${spanText(shared)}`, say: `You are free for only ${spanText(shared)} of it, ${free}. Dropping in takes at least ${spanText(MIN_DROP_IN_MINUTES)}.`, ...drawing }
  }
  if (span.kind === 'fits') {
    if (spare === 0) return { kind: 'fits', label: 'Fits exactly', say: `Fits exactly. It fills your free time, ${free}.`, ...drawing }
    if (spare < TIGHT_MINUTES) return { kind: 'fits', label: `${spanText(spare)} spare`, say: `Fits your free time, ${free}, with ${spanText(spare)} spare.`, ...drawing }
    return { kind: 'fits', label: 'Fits', say: `Fits your free time, ${free}.`, ...drawing }
  }
  // The red on the bar already shows which side the event sticks out, so the words give the minutes.
  const label = over ? `${spanText(early + over)} over` : `${spanText(early)} early`
  // "Runs 35 min over" needs "your free time" after it. The other two sentences already name it.
  const how = sentence(missText(early, over)) + (over && !early ? ' your free time' : '')
  return { kind: 'over', label, say: `${how}, ${free}.`, ...drawing }
}

/** The stretches of one known day, or null when the day is unknown or not in the list. */
function knownDay(days: readonly FitDay[], date: string): readonly FitWindow[] | null {
  const day = days.find(item => item.date === date)
  return day && day.known ? day.windows : null
}

/**
 * Adds the mark to every ticket of a Discover screen that has none yet, from the student's own
 * week. A ticket stays without one when its day is unknown, when it is already in My Schedule
 * (its time is busy because of itself), or when it is under way (the Now mark speaks for it).
 */
export function withFitMarks(screen: DiscoverScreen, days: readonly FitDay[] | undefined): DiscoverScreen {
  if (!days?.length) return screen
  return {
    ...screen,
    days: screen.days.map(day => ({
      ...day,
      events: day.events.map(stub => {
        if (stub.fitMark || stub.planned || stub.live?.kind === 'now' || !stub.clock) return stub
        const windows = knownDay(days, stub.date)
        if (!windows) return stub
        const fitMark = presentFitMark({ date: stub.date, ...stub.clock, ...(stub.dropIn ? { attend: 'dropin' as const } : {}) }, windows, 'say')
        return fitMark ? { ...stub, fitMark } : stub
      }),
    })),
  }
}
