// MODEL: explain time-window eligibility without changing M2's strict full-fit rule.
// Partial overlap does not establish permission to join an event late or leave early.
import { isValidDate, toMinutes } from './events'

export type FitTimeRecord = {
  date: string
  start: string
  end?: string | null
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
  if (start >= freeStart && end <= freeEnd) {
    return { kind: 'fits', reason: 'The entire scheduled event fits your free time.', overlapMinutes: end - start }
  }
  const overlapMinutes = Math.max(0, Math.min(end, freeEnd) - Math.max(start, freeStart))
  if (overlapMinutes === 0) {
    return { kind: 'outside', reason: 'The event and your free time do not overlap.', overlapMinutes: 0 }
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
