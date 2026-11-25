// CONTROLLER: prepare a device-local Schedule screen from resolved plan entries.
import { eventPhase, minutesUntilStart, overlapSpan } from '../model/eventTiming'
import { layoutDayTimeline, type DayTimeline } from './scheduleTimeline'
import { presentClashes, type ClashModel } from './presentClash'
import { byTime, describeDay, groupDays, spanText, toStub, type ScreenEvent, type StubModel, type DayModel } from './screenModels'

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
  /** An event shown on its day before it is planned ("My day" on an event card). Never counted as a plan. */
  previewId?: string | null
}

export type PlanStubModel = StubModel & {
  overlap: { title: string; text: string } | null
  done: boolean
  /** Shown to see where it would fall; not in My Schedule. */
  preview?: boolean
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
  days: (DayModel & { events: PlanStubModel[]; overlapNote: string | null; timeline: DayTimeline | null; clashes: ClashModel[] })[]
  done: PlanStubModel[]
  capacityMessage: string | null
  unresolved: { id: string }[]
  missing: { id: string }[]
}

function presentNextUp(first: PlanStubModel, event: ScreenEvent | undefined, now: Date): NextUpModel {
  if (first.live?.kind === 'now') {
    return { stub: first, kind: 'now', when: first.live.text }
  }

  const day = describeDay(first.date, now)
  const startTime = `${first.start.time}${first.start.ampm}`
  if (day.isToday) {
    // Work from the verified source event; never parse the UI's formatted time.
    const minutes = event ? minutesUntilStart(event, now) : 0
    return { stub: first, kind: 'today', when: `in ${spanText(minutes)}` }
  }
  if (day.tag === 'TOMORROW') {
    return { stub: first, kind: 'tomorrow', when: `Tomorrow at ${startTime}` }
  }
  // Preserve the existing short-weekday/date display. The full date stays in the model.
  return {
    stub: first, kind: 'later',
    when: `${day.long.split(',')[0].slice(0, 3)} ${first.dateText.slice(0, -5)} at ${startTime}`,
  }
}

export function presentSchedule(input: ScheduleInput, now: Date = new Date()): ScheduleScreen {
  const ids = new Set(input.entries.map(entry => entry.event.id).filter(id => id !== input.previewId))
  const sorted = [...input.entries].sort((a, b) => byTime(a.event, b.event))
  const stubs: PlanStubModel[] = sorted.map(({ event, conflict }) => {
    const span = conflict ? overlapSpan(event, conflict) : null
    return {
      ...toStub(event, now, ids, null),
      overlap: conflict && span ? { title: conflict.title, text: `Overlaps ${conflict.title} by ${spanText(span.to - span.from)}` } : null,
      done: eventPhase(event, now) === 'ended',
      ...(event.id === input.previewId ? { preview: true } : {}),
    }
  })
  const upcoming = stubs.filter(stub => !stub.done)
  const done = stubs.filter(stub => stub.done)
  const eventsById = new Map(sorted.map(entry => [entry.event.id, entry.event]))
  const days = groupDays(upcoming, now).map(day => {
    const count = day.events.filter(event => event.overlap !== null).length
    const overlapNote = count ? `${count} plans have conflicts` : null
    const dayEvents = day.events.flatMap(stub => {
      const event = eventsById.get(stub.id)
      return event ? [event] : []
    })
    const timeline = layoutDayTimeline(dayEvents)
    return { ...day, overlapNote, timeline, clashes: presentClashes(dayEvents, now) }
  })

  const first = upcoming.find(stub => !stub.preview)
  const firstEvent = first ? sorted.find(entry => entry.event.id === first.id)?.event : undefined
  const nextUp = first ? presentNextUp(first, firstEvent, now) : null

  return {
    status: input.blocked ? 'blocked' : input.loading ? 'loading' : input.ids.length === 0 && !input.previewId ? 'empty' : 'ready',
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

/** Add one unplanned event to the Schedule input so its day shows where it would fall, clashes included.
 *  The preview overlaps the first planned event that shares its time, so the clash reads the same as a plan's. */
export function withPreview(input: ScheduleInput, event: ScreenEvent | null): ScheduleInput {
  if (!event || input.ids.includes(event.id) || input.entries.some(entry => entry.event.id === event.id)) return input
  const conflict = input.entries.find(entry => overlapSpan(event, entry.event))?.event ?? null
  return { ...input, entries: [...input.entries, { event, conflict }], previewId: event.id }
}
