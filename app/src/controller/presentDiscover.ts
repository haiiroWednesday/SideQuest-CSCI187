// CONTROLLER: prepare upcoming-event groups and free-window feedback for Discover.
import { eventPhase } from '../model/eventTiming'
import { assessEventFit } from '../model/fitAssessment'
import { EVENT_CATEGORIES, suggestedEventCategory, type EventCategorySelection } from '../model/eventCategories'
import { findEvents } from './findEvents'
import { EVENT_TAGS, hasAllTags, type EventTag } from '../model/eventTags'
import { campusNow } from '../model/eventCatalog'
import { byTime, groupDays, toStub, type ScreenEvent, type FreeWindow, type FreeWindowModel, type DiscoverScreen, type NearMissModel } from './screenModels'
import { fitSpan } from '../model/fitMark'
import { missText, presentFitMark } from './presentFitMark'

// ---------- Discover

export function presentDiscover(input: {
  events: readonly ScreenEvent[]
  loading?: boolean
  error?: string | null
  category?: EventCategorySelection
  /** Host-set tags the student picked (free food, guest speaker, ...). An event shows when it has all of them. */
  tags?: readonly EventTag[]
  plannedIds?: readonly string[]
  planningBlocked?: boolean
  /** pass a window to show the "When are you free?" row; omit to hide it */
  freeWindow?: FreeWindow
  /** gaps picked on the day ruler; an event shows when it fits inside any of them */
  /** Free stretches the student marked, on any days. An event fits when it fits inside one of them. */
  freeWindows?: readonly { date: string; start: string; end: string }[]
  now?: Date
}): DiscoverScreen {
  const now = input.now ?? new Date()
  const planned = new Set(input.plannedIds ?? [])
  const plannedCount = planned.size

  // An open tab outlives events: drop anything that has ended since the catalog was read.
  const allUpcoming = input.events.filter(event => eventPhase(event, now) !== 'ended').sort(byTime)
  const selectedCategory = input.category ?? 'all'
  const categorized = allUpcoming.map(event => ({ event, category: suggestedEventCategory({
    title: event.title,
    hostName: event.hostName ?? '',
  }) }))
  const categories = {
    selected: selectedCategory,
    options: [
      { id: 'all' as const, label: 'All activities', symbol: '✧', count: allUpcoming.length },
      ...EVENT_CATEGORIES.map(item => ({
        id: item.id,
        label: item.label,
        symbol: item.symbol,
        count: categorized.filter(entry => entry.category === item.id).length,
      })),
    ],
  }
  const chosenTags = input.tags ?? []
  const inCategory = categorized.filter(entry => selectedCategory === 'all' || entry.category === selectedCategory)
    .map(entry => entry.event)
  const upcoming = inCategory.filter(event => hasAllTags(event, chosenTags))
  // Counts show how many events in the chosen category carry each tag, so a chip never promises more than it shows.
  const tagFilters = {
    selected: [...chosenTags],
    options: EVENT_TAGS.map(tag => ({ id: tag.id, label: tag.label, count: inCategory.filter(event => event.tags?.includes(tag.id)).length })),
  }

  let freeWindow: FreeWindowModel | null = null
  let fitting: Set<string> | null = null
  let nearMisses: NearMissModel[] = []
  if (input.freeWindow) {
    const values = input.freeWindow
    const complete = Boolean(values.date && values.start && values.end)
    const search = complete ? findEvents(upcoming, values.date, values.start, values.end) : null
    if (search && !search.error) {
      fitting = new Set(search.matches.map(event => event.id))
      const matched = fitting
      // Other dates do not become near misses. Strict full-fit results stay unchanged.
      const rank = { overlap: 0, unknown: 1, outside: 2 }
      nearMisses = upcoming
        .filter(event => event.date === values.date && !matched.has(event.id))
        .flatMap(event => {
          const assessment = assessEventFit(event, values)
          return assessment.kind === 'fits'
            ? []
            : [{ id: event.id, title: event.title, kind: assessment.kind, reason: assessment.reason }]
        })
        .sort((a, b) => rank[a.kind] - rank[b.kind] || a.title.localeCompare(b.title))
        .slice(0, 5)
    }
    const fitCount = fitting ? fitting.size : null
    freeWindow = {
      values,
      active: fitting !== null,
      fitCount,
      fitText: fitCount === null ? null : fitCount === 0 ? 'Nothing fits' : `${fitCount} fit`,
      hint: !complete && Boolean(values.date || values.start || values.end)
        ? 'Showing all upcoming events. Complete the date and both times to filter.'
        : complete && !search?.error && windowHasPassed(values, now)
          ? 'That time has already passed. Try a later time or another day.' : null,
      error: search?.error ?? null,
      canClear: Boolean(values.date || values.start || values.end),
    }
  }

  const freeActive = Boolean(freeWindow?.active)
  // An empty list still filters: "Tonight" with no free time shows nothing, not everything.
  if (!freeActive && input.freeWindows) {
    fitting = new Set(input.freeWindows.flatMap(w => { const r = findEvents(upcoming, w.date, w.start, w.end); return r.error ? [] : r.matches.map(e => e.id) }))
  }
  const fitLine = !freeActive && input.freeWindows && fitting ? fitLineFor(upcoming, fitting.size, input.freeWindows) : null
  const base = { plannedCount, freeWindow, nearMisses, fitLine, categories, tagFilters, planningBlocked: Boolean(input.planningBlocked) }
  if (input.loading) return { ...base, status: 'loading', errorMessage: null, days: [], count: 0, headingText: 'Coming up' }
  if (input.error) return { ...base, status: 'error', errorMessage: input.error, days: [], count: 0, headingText: 'Coming up' }
  if (allUpcoming.length === 0) return { ...base, status: 'empty', errorMessage: null, days: [], count: 0, headingText: 'Coming up' }

  const visible = fitting ? upcoming.filter(event => fitting.has(event.id)) : upcoming
  // The stretches the list was filtered by also draw each kept ticket's fit mark, so the mark
  // never disagrees with the list.
  const fitWindows = freeActive && input.freeWindow ? [input.freeWindow] : input.freeWindows ?? []
  const stubs = visible.map(event => {
    const stub = toStub(event, now, planned, fitting)
    const fitMark = fitting?.has(event.id) ? presentFitMark(event, fitWindows) : null
    return fitMark ? { ...stub, fitMark } : stub
  })
  return {
    ...base,
    status: 'ready',
    errorMessage: null,
    days: groupDays(stubs, now),
    count: stubs.length,
    headingText: `Coming up, ${stubs.length} ${stubs.length === 1 ? 'event' : 'events'}`,
  }
}

/** "3 events fit your free time", or, when nothing fits, the nearest miss in one plain line:
 *  "Nothing fits. Climbing Club Intro runs 35 min over." Only events that overlap a free
 *  stretch can be near; the one with the fewest minutes outside it is named. */
export function fitLineFor(events: readonly ScreenEvent[], count: number, windows: readonly { date: string; start: string; end: string }[]): string {
  if (count === 1) return '1 event fits your free time'
  if (count > 1) return `${count} events fit your free time`
  // The Model measures each event against its nearest free stretch. The same numbers draw the fit mark.
  let best: { title: string; early: number; over: number; start: number } | null = null
  for (const event of events) {
    const span = fitSpan(event, windows)
    if (!span) continue
    const { early, over, eventStart: start } = span
    const miss = early + over
    if (!best || miss < best.early + best.over || (miss === best.early + best.over && start < best.start)) best = { title: event.title, early, over, start }
  }
  if (!best) return 'Nothing fits your free time'
  return `Nothing fits. ${best.title} ${missText(best.early, best.over)}.`
}

/** A complete window that ends before the campus clock (an earlier day, or earlier today). */
function windowHasPassed(values: FreeWindow, now: Date): boolean {
  const campus = campusNow(now)
  return values.date < campus.date || (values.date === campus.date && values.end <= campus.time)
}
