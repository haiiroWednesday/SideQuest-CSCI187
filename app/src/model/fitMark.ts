// MODEL: where one event sits against the free stretch around it, in minutes.
// This adds no fit rule. assessEventFit decides what fits (a set-time event wholly inside the
// stretch, or a drop-in event that shares enough of it) and what only overlaps. This file picks
// which free stretch to measure against and reports the numbers: the stretch, the event, and how
// many minutes of the event fall before or after the stretch.
import { toMinutes } from './events'
import { MIN_DROP_IN_MINUTES, attendOf } from './attend'
import { assessEventFit, type FitTimeRecord, type FitWindow } from './fitAssessment'

export type FitSpan = {
  /** 'fits': the event fits the stretch. 'overlap': it touches the stretch and does not fit. */
  kind: 'fits' | 'overlap'
  /** All four are minutes after midnight. */
  freeStart: number
  freeEnd: number
  eventStart: number
  eventEnd: number
  /** Minutes of the event before the stretch starts. */
  early: number
  /** Minutes of the event after the stretch ends. */
  over: number
  /** Free minutes left once the event is taken out. 0 when it does not fit, or sticks out. */
  spare: number
  /** Present only for a drop-in event, which may fit while part of it is outside the stretch. */
  dropIn?: true
}

/** Minutes the event and its stretch have in common: what a student gets of a drop-in event. */
export function sharedOf(span: FitSpan): number {
  return (span.eventEnd - span.eventStart) - span.early - span.over
}

/**
 * How many more free minutes the event would need to fit. 0 when it fits.
 * A set-time event needs every minute that falls outside the stretch. A drop-in event only
 * needs enough to reach MIN_DROP_IN_MINUTES shared.
 */
export function minutesShort(span: FitSpan): number {
  if (span.kind === 'fits') return 0
  return span.dropIn ? MIN_DROP_IN_MINUTES - sharedOf(span) : span.early + span.over
}

/**
 * The free stretch an event is measured against, and the numbers.
 * A stretch the event fits wins. For a set-time event that is the first one it sits inside. A
 * drop-in event may fit several stretches, so it takes the one it shares the most minutes with
 * (the first on a tie). Otherwise it is the overlapping stretch the event is nearest to fitting
 * (the first on a tie). Null when the event has no usable times or touches no free stretch on
 * its day.
 */
export function fitSpan(event: FitTimeRecord, windows: readonly FitWindow[]): FitSpan | null {
  const dropIn = attendOf(event) === 'dropin'
  let best: FitSpan | null = null
  for (const window of windows) {
    const kind = assessEventFit(event, window).kind
    if (kind !== 'fits' && kind !== 'overlap') continue
    // assessEventFit has already checked all four times.
    const freeStart = toMinutes(window.start)!, freeEnd = toMinutes(window.end)!
    const eventStart = toMinutes(event.start)!, eventEnd = toMinutes(event.end!)!
    const early = Math.max(0, freeStart - eventStart), over = Math.max(0, eventEnd - freeEnd)
    const span: FitSpan = {
      kind, freeStart, freeEnd, eventStart, eventEnd, early, over,
      spare: kind === 'fits' && !early && !over ? (freeEnd - freeStart) - (eventEnd - eventStart) : 0,
      ...(dropIn ? { dropIn: true as const } : {}),
    }
    if (kind === 'fits' && !dropIn) return span
    if (!best || better(span, best)) best = span
  }
  return best
}

/** A fit beats an overlap. Between fits, more shared minutes. Between overlaps, fewer minutes short. */
function better(a: FitSpan, b: FitSpan): boolean {
  if (a.kind !== b.kind) return a.kind === 'fits'
  return a.kind === 'fits' ? sharedOf(a) > sharedOf(b) : minutesShort(a) < minutesShort(b)
}
