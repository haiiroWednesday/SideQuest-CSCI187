// CONTROLLER: prepare upcoming-event groups and free-window feedback for Discover.
import { eventPhase } from '../model/eventTiming'
import { findEvents } from './findEvents'
import {
  byTime,
  groupDays,
  toStub,
  type ScreenEvent,
  type FreeWindow,
  type FreeWindowModel,
  type DiscoverScreen,
} from './screenModels'

// ---------- Discover

export function presentDiscover(input: {
  events: readonly ScreenEvent[]
  loading?: boolean
  error?: string | null
  plannedIds?: readonly string[]
  planningBlocked?: boolean
  /** pass a window to show the "When are you free?" row; omit to hide it */
  freeWindow?: FreeWindow
  now?: Date
}): DiscoverScreen {
  const now = input.now ?? new Date()
  const planned = new Set(input.plannedIds ?? [])
  const plannedCount = planned.size

  // An open tab outlives events: drop anything that has ended since the catalog was read.
  const upcoming = input.events.filter(event => eventPhase(event, now) !== 'ended').sort(byTime)

  let freeWindow: FreeWindowModel | null = null
  let fitting: Set<string> | null = null
  if (input.freeWindow) {
    const values = input.freeWindow
    const complete = Boolean(values.date && values.start && values.end)
    const search = complete ? findEvents(upcoming, values.date, values.start, values.end) : null
    if (search && !search.error) fitting = new Set(search.matches.map(event => event.id))
    const fitCount = fitting ? fitting.size : null
    freeWindow = {
      values,
      active: fitting !== null,
      fitCount,
      fitText: fitCount === null ? null : fitCount === 0 ? 'Nothing fits' : `${fitCount} fit`,
      hint:
        !complete && Boolean(values.date || values.start || values.end)
          ? 'Showing all upcoming events. Complete the date and both times to filter.'
          : null,
      error: search?.error ?? null,
      canClear: Boolean(values.date || values.start || values.end),
    }
  }

  const base = { plannedCount, freeWindow, planningBlocked: Boolean(input.planningBlocked) }
  if (input.loading)
    return {
      ...base,
      status: 'loading',
      errorMessage: null,
      days: [],
      count: 0,
      headingText: 'Coming up',
    }
  if (input.error)
    return {
      ...base,
      status: 'error',
      errorMessage: input.error,
      days: [],
      count: 0,
      headingText: 'Coming up',
    }
  if (upcoming.length === 0)
    return {
      ...base,
      status: 'empty',
      errorMessage: null,
      days: [],
      count: 0,
      headingText: 'Coming up',
    }

  const visible = fitting ? upcoming.filter(event => fitting.has(event.id)) : upcoming
  const stubs = visible.map(event => toStub(event, now, planned, fitting))
  return {
    ...base,
    status: 'ready',
    errorMessage: null,
    days: groupDays(stubs, now),
    count: stubs.length,
    headingText: `Coming up, ${stubs.length} ${stubs.length === 1 ? 'event' : 'events'}`,
  }
}
