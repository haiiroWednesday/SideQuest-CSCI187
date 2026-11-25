// MODEL: where one event sits against the free stretch around it, in minutes.
// This adds no fit rule. assessEventFit decides what fits (the strict full-fit rule) and what
// only overlaps. This file picks which free stretch to measure against and reports the numbers:
// the stretch, the event, and how many minutes of the event fall before or after the stretch.
import { toMinutes } from './events'
import { assessEventFit, type FitTimeRecord, type FitWindow } from './fitAssessment'

export type FitSpan = {
  /** 'fits': the whole event is inside the stretch. 'overlap': part of it falls outside. */
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
  /** Free minutes left once the event is taken out. 0 when it does not fit. */
  spare: number
}

/**
 * The free stretch an event is measured against, and the numbers.
 * A stretch the event fits inside wins (the first one). Otherwise it is the overlapping stretch
 * that leaves the fewest minutes of the event outside (the first on a tie). Null when the event
 * has no usable times or touches no free stretch on its day.
 */
export function fitSpan(event: FitTimeRecord, windows: readonly FitWindow[]): FitSpan | null {
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
      spare: kind === 'fits' ? (freeEnd - freeStart) - (eventEnd - eventStart) : 0,
    }
    if (kind === 'fits') return span
    if (!best || early + over < best.early + best.over) best = span
  }
  return best
}
