// CONTROLLER: prepare a device-local Schedule screen from resolved plan entries.
import { calendarDay, eventPhase, minutesUntilStart, overlapSpan } from '../model/eventTiming'
import {
  byTime,
  describeDay,
  groupDays,
  spanText,
  toStub,
  type ScreenEvent,
  type StubModel,
  type DayModel,
} from './screenModels'

// ---------- My Schedule

/** The shape the Schedule controller already returns (entries with one representative conflict, plus IDs it could not find). */
export type ScheduleInput = {
  ids: readonly string[]
  entries: readonly { event: ScreenEvent; conflict: ScreenEvent | null }[]
  missingIds: readonly string[]
  blocked?: boolean
  loading?: boolean
  capacityMessage?: string | null
  unresolvedIds?: readonly string[]
}

export type PlanStubModel = StubModel & {
  overlap: { title: string; text: string } | null
  done: boolean
}

export type NextUpModel = {
  stub: PlanStubModel
  /** "in 1 hr 30 min", "Happening now", "Tomorrow at 3:00pm", "Sat 11/7 at 3:00pm" */
  when: string
  kind: 'now' | 'today' | 'tomorrow' | 'later'
}

export type ScheduleScreen = {
  status: 'empty' | 'ready' | 'blocked' | 'loading'
  plannedCount: number
  overlapCount: number
  missingCount: number
  nextUp: NextUpModel | null
  days: (DayModel & { events: PlanStubModel[]; overlapNote: string | null })[]
  done: PlanStubModel[]
  capacityMessage: string | null
  unresolved: { id: string }[]
  missing: { id: string }[]
}

function presentNextUp(
  stub: PlanStubModel,
  event: ScreenEvent | undefined,
  now: Date,
): NextUpModel {
  if (stub.live?.kind === 'now') {
    return { stub, kind: 'now', when: stub.live.text }
  }

  const day = describeDay(stub.date, now)
  const startTime = `${stub.start.time}${stub.start.ampm}`
  if (day.isToday) {
    // Use the unformatted event time rather than parsing text displayed by the View.
    const remainingMinutes = event ? minutesUntilStart(event, now) : 0
    return { stub, kind: 'today', when: `in ${spanText(remainingMinutes)}` }
  }
  if (day.tag === 'TOMORROW') {
    return { stub, kind: 'tomorrow', when: `Tomorrow at ${startTime}` }
  }

  const { month, day: dayOfMonth } = calendarDay(stub.date)
  const shortWeekday = day.dow[0] + day.dow.slice(1).toLowerCase()
  return { stub, kind: 'later', when: `${shortWeekday} ${month}/${dayOfMonth} at ${startTime}` }
}

export function presentSchedule(input: ScheduleInput, now: Date = new Date()): ScheduleScreen {
  const ids = new Set(input.entries.map(entry => entry.event.id))
  const sorted = [...input.entries].sort((a, b) => byTime(a.event, b.event))
  const stubs: PlanStubModel[] = sorted.map(({ event, conflict }) => {
    const span = conflict ? overlapSpan(event, conflict) : null
    return {
      ...toStub(event, now, ids, null),
      overlap:
        conflict && span
          ? {
              title: conflict.title,
              text: `Overlaps ${conflict.title} by ${spanText(span.to - span.from)}`,
            }
          : null,
      done: eventPhase(event, now) === 'ended',
    }
  })
  const upcoming = stubs.filter(stub => !stub.done)
  const done = stubs.filter(stub => stub.done)
  const days = groupDays(upcoming, now).map(day => {
    const count = day.events.filter(event => event.overlap !== null).length
    const overlapNote = count ? `${count} plans have conflicts` : null
    return { ...day, overlapNote }
  })

  const first = upcoming[0]
  const firstEvent = first ? sorted.find(entry => entry.event.id === first.id)?.event : undefined
  const nextUp = first ? presentNextUp(first, firstEvent, now) : null

  return {
    status: input.blocked
      ? 'blocked'
      : input.loading
        ? 'loading'
        : input.ids.length === 0
          ? 'empty'
          : 'ready',
    plannedCount: input.ids.length,
    overlapCount: upcoming.filter(stub => stub.overlap).length,
    missingCount: input.missingIds.length,
    nextUp,
    days,
    done,
    capacityMessage: input.capacityMessage ?? null,
    unresolved: (input.unresolvedIds ?? []).map(id => ({ id })),
    missing: input.missingIds.map(id => ({ id })),
  }
}
