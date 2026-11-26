// MODEL: explain whether an event fits a free stretch, and why.
// A set-time event keeps M2's strict full-fit rule: partial overlap does not establish permission
// to join late or leave early. A drop-in event (the host said "Drop in any time") also fits when
// it shares MIN_DROP_IN_MINUTES or more with the free stretch. The minute rule itself is
// fitsFreeMinutes in attend.ts, shared with matchingEvents in events.ts.
import { isValidDate, toMinutes } from './events'
import { MIN_DROP_IN_MINUTES, attendOf, fitsFreeMinutes, sharedMinutes, type AttendMode } from './attend'

export { MIN_DROP_IN_MINUTES } from './attend'

export type FitTimeRecord = {
  date: string
  start: string
  end?: string | null
  /** Absent means 'set'. */
  attend?: AttendMode
}
export type FitWindow = { date: string; start: string; end: string }
export type FitAssessment = {
  kind: 'fits' | 'overlap' | 'outside' | 'unknown'
  reason: string
  overlapMinutes: number | null
}

export function assessEventFit(event: FitTimeRecord, available: FitWindow): FitAssessment {
  const freeStart = toMinutes(available.start)
  const freeEnd = toMinutes(available.end)
  if (!isValidDate(available.date) || freeStart === null || freeEnd === null || freeStart >= freeEnd) {
    return { kind: 'unknown', reason: 'Enter a valid date and time window.', overlapMinutes: null }
  }
  if (event.date !== available.date) {
    return { kind: 'outside', reason: 'Scheduled on a different date.', overlapMinutes: 0 }
  }
  const start = toMinutes(event.start)
  const end = event.end ? toMinutes(event.end) : null
  if (start === null || end === null || end <= start) {
    return { kind: 'unknown', reason: 'The end time is missing, so we can\'t tell if it fits your free time.', overlapMinutes: null }
  }
  const dropIn = attendOf(event) === 'dropin'
  const overlapMinutes = sharedMinutes(start, end, freeStart, freeEnd)
  if (fitsFreeMinutes(attendOf(event), start, end, freeStart, freeEnd)) {
    return start >= freeStart && end <= freeEnd
      ? { kind: 'fits', reason: 'The entire scheduled event fits your free time.', overlapMinutes }
      : { kind: 'fits', reason: 'Drop in any time. You are free for ' + String(overlapMinutes) + ' minutes of it.', overlapMinutes }
  }
  if (overlapMinutes === 0) {
    return { kind: 'outside', reason: 'The event and your free time do not overlap.', overlapMinutes: 0 }
  }
  if (dropIn) {
    return {
      kind: 'overlap',
      reason: 'Drop in any time, but you are free for only ' + String(overlapMinutes) + ' minutes of it. Stopping by takes at least ' +
        String(MIN_DROP_IN_MINUTES) + ' minutes.',
      overlapMinutes,
    }
  }
  const reasons: string[] = []
  if (start < freeStart) reasons.push('starts ' + String(freeStart - start) + ' minutes before you are free')
  if (end > freeEnd) reasons.push('ends ' + String(end - freeEnd) + ' minutes after your free time')
  return {
    kind: 'overlap',
    reason: 'Overlaps for ' + String(overlapMinutes) + ' minutes but ' + reasons.join(' and ') +
      '. Late arrival or early departure has not been verified.',
    overlapMinutes,
  }
}
