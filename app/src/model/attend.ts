// MODEL: how an event is attended, and the minute arithmetic of the fit rule.
//   'set'    Starts at a set time (a talk, a show, a workshop): be there for all of it.
//   'dropin' Drop in any time (a fair, tabling, an open studio, a study jam).
// The host says which on Post. An event without the field is 'set', which is what every event
// posted or imported before this field means. It is never guessed from a title or description.
//
// The fit rule lives here in minutes so its two callers cannot drift apart: assessEventFit
// (fitAssessment.ts), which explains a fit, and matchingEvents (events.ts), which filters by it.
export const ATTEND_MODES = ['set', 'dropin'] as const
export type AttendMode = typeof ATTEND_MODES[number]
/** The two choices as a host reads them on Post, the default first. */
export const ATTEND_CHOICES: readonly { id: AttendMode; label: string }[] = [
  { id: 'set', label: 'Starts at a set time' },
  { id: 'dropin', label: 'Drop in any time' },
]

export function isAttendMode(value: unknown): value is AttendMode {
  return (ATTEND_MODES as readonly unknown[]).includes(value)
}

/** The mode an event has. Absent, or anything unknown, is 'set': the strict reading. */
export function attendOf(event: { attend?: unknown }): AttendMode {
  return event.attend === 'dropin' ? 'dropin' : 'set'
}

/** A drop-in event fits a free stretch when they share at least this many minutes. */
export const MIN_DROP_IN_MINUTES = 20

export const ATTEND_ERROR = 'Choose how to attend: starts at a set time, or drop in any time.'

/** Minutes an event and a free stretch have in common. All four are minutes after midnight. */
export function sharedMinutes(eventStart: number, eventEnd: number, freeStart: number, freeEnd: number): number {
  return Math.max(0, Math.min(eventEnd, freeEnd) - Math.max(eventStart, freeStart))
}

/**
 * The fit rule, in minutes after midnight. Callers check the date and the four times first.
 * An event that sits wholly inside the free stretch fits, whatever its mode.
 * A drop-in event also fits when it shares MIN_DROP_IN_MINUTES or more with the stretch.
 * A set-time event that sticks out on either side never fits.
 */
export function fitsFreeMinutes(attend: AttendMode, eventStart: number, eventEnd: number, freeStart: number, freeEnd: number): boolean {
  if (freeStart <= eventStart && eventEnd <= freeEnd) return true
  return attend === 'dropin' && sharedMinutes(eventStart, eventEnd, freeStart, freeEnd) >= MIN_DROP_IN_MINUTES
}
