// CONTROLLER: "what's open" ideas for a free stretch and open/closed lines for places.
// It reads the hours model and the labelled walk estimate; it never changes what fits:
// strict full fit stays the only rule for events. A place idea is a quiet extra line.
import type { LegacyCampusEvent } from '../model/events'
import { clockLabel, openFor, PLACE_HOURS, statusAt, type PlaceHours } from '../model/placeHours'
import { walkBetween } from '../model/walkEstimate'
import { campusNow } from '../model/eventCatalog'

/** The event shape the view passes in, re-exported so views never import the Model. */
export type IdeaEvent = LegacyCampusEvent
export type Stretch = { date: string; start: string; end: string }
export type OpenIdea = { placeId: string; name: string; mapLabel: string; text: string; walkMinutes: number | null; closes: number }

const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
/** A place has to stay open this long (or to the end of a shorter stretch) to be worth suggesting. */
export const MIN_USEFUL_MINUTES = 30

/** Where you'll be when the stretch starts: the last plan that ends by then, that day. */
function originFor(stretch: Stretch, events: readonly LegacyCampusEvent[], plannedIds: readonly string[]): LegacyCampusEvent | null {
  const planned = new Set(plannedIds), start = mins(stretch.start)
  return events
    .filter(e => planned.has(e.id) && e.date === stretch.date && mins(e.end) <= start)
    .sort((a, b) => mins(b.end) - mins(a.end))[0] ?? null
}

/**
 * One place that is open when a free stretch starts and stays open long enough.
 * Closer first (walk from your previous plan, when there is one), then dining before the gym,
 * then the one open longest. Places with unknown or unclear hours are never suggested.
 */
export function openIdeaFor(stretch: Stretch, ctx: {
  events: readonly LegacyCampusEvent[]; plannedIds: readonly string[]; now?: Date; places?: readonly PlaceHours[]
}): OpenIdea | null {
  const places = ctx.places ?? PLACE_HOURS
  let from = mins(stretch.start)
  const end = mins(stretch.end)
  if (ctx.now) {
    const here = campusNow(ctx.now)
    if (here.date > stretch.date) return null
    if (here.date === stretch.date) from = Math.max(from, mins(here.time))
  }
  const room = end - from
  if (room < 15) return null
  const need = Math.min(MIN_USEFUL_MINUTES, room)
  const origin = originFor(stretch, ctx.events, ctx.plannedIds)
  const ranked = places
    .map(place => {
      const open = openFor(place, stretch.date, from)
      if (open < need) return null
      const walk = origin ? walkBetween(origin.location, place.place) : null
      const walkMinutes = walk && walk.status === 'ready' ? walk.minutes : null
      return { place, open, walkMinutes }
    })
    .filter((x): x is { place: PlaceHours; open: number; walkMinutes: number | null } => x !== null)
    .sort((a, b) =>
      (a.walkMinutes ?? 999) - (b.walkMinutes ?? 999) ||
      (a.place.kind === 'dining' ? 0 : 1) - (b.place.kind === 'dining' ? 0 : 1) ||
      b.open - a.open)
  const pick = ranked[0]
  if (!pick) return null
  const closes = from + pick.open
  const until = `open until ${clockLabel(closes)}`
  const text = pick.walkMinutes === 0
    ? `${pick.place.name} is ${until}, in the same building`
    : pick.walkMinutes !== null
    ? `${pick.place.name} is ${until}, ${pick.walkMinutes} min walk`
    : `${pick.place.name} in ${pick.place.place} is ${until}`
  return { placeId: pick.place.id, name: pick.place.name, mapLabel: pick.place.place, text, walkMinutes: pick.walkMinutes, closes }
}

/** One line per venue for a map place, e.g. "The Cellar: Open until 11:59pm". */
export function placeHoursLines(mapLabel: string, now: Date = new Date()): { name: string; label: string; state: string }[] {
  const { date, time } = campusNow(now)
  return PLACE_HOURS.filter(p => p.place === mapLabel).map(p => {
    const s = statusAt(p, date, mins(time))
    return { name: p.name, label: s.label, state: s.state }
  })
}
