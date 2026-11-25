// CONTROLLER: a clash, laid out so a student can weigh it and decide.
// Plans that overlap (directly or through a chain) form one clash. The sheet draws them on one
// shared time ruler, so the overlap is visible at a glance, and lists what each plan asks of you.
import { campusNow } from '../model/eventCatalog'
import { clockSpan, clockText, toMinutes } from '../model/events'
import { overlapMinutes } from '../model/eventTiming'
import { walkBetween } from '../model/walkEstimate'
import { presentBrowseDetail, spanText, type ScreenEvent, type StubModel } from './screenModels'
import { categoryOfPlan } from './eventCategory'
import { neighbours } from './timeAdvice'
import type { GoingModel } from './friendsGoing'

/** What one plan in a clash says about itself, before it is compared with the others. */
export type ClashFacts = {
  /** When it ends and how long it runs, in minutes, so the gap between plans can be said. */
  endMin: number
  lengthMin: number
  /** Minutes of this plan that overlap the others: "1 hr". */
  overlap: string
  /** The walk from the plan before this one: "6 min from Chem lab". Null when the map cannot say. */
  walk: string | null
  /** Friends from your groups who chose to show they are going: "Maya + 1 friend". */
  going?: string | null
  /** Tag words in the catalog's order: "Free food", "RSVP". */
  tags: readonly string[]
}
export type DifferKey = 'ends' | 'length' | 'overlap' | 'walk' | 'going' | 'tags'
/** One fact the plans do not share. cells[i] belongs to plans[i]. */
export type DifferRow = { key: DifferKey; label: string; cells: string[] }

/**
 * Rows the sheet leaves out because each ticket above already prints that fact (its length on the
 * stub, its tags under the title): the owner's rule is one fact once per screen.
 */
export const ON_THE_TICKET: ReadonlySet<DifferKey> = new Set<DifferKey>(['length', 'tags'])
/** The rows worth a line under the tickets: what differs and is not already printed on them. */
export const rowsBelowTickets = (rows: readonly DifferRow[]): DifferRow[] => rows.filter(r => !ON_THE_TICKET.has(r.key))

/** Said in a cell when a plan has nothing for a fact another plan has. */
export const DIFFER_NONE = 'none'
/** A missing walk is not "no walk": the map cannot say, so the cell says that. */
export const DIFFER_WALK_UNKNOWN = 'not known'
const DIFFER_ORDER: readonly { key: DifferKey; label: string }[] = [
  { key: 'ends', label: 'Ends' },
  { key: 'length', label: 'Length' },
  { key: 'overlap', label: 'Overlap' },
  { key: 'walk', label: 'Walk' },
  { key: 'going', label: 'Going' },
  { key: 'tags', label: 'Tags' },
]
const tidy = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()
const same = (text: string) => text.toLowerCase()

/**
 * What differs between clashing plans, so the choice is read row by row.
 * - A fact every plan shares gives no row.
 * - A fact one plan lacks reads "none" for that plan (a walk the map cannot give reads "not known").
 * - Rows always come in the same order, and every row has one cell per plan, in the plans' order.
 * The ticket above each column already prints its end time and length, so those two rows say the gap
 * instead ("30 min later"): the trade is read without doing the sum, and no fact shows twice.
 */
export function whatDiffers(plans: readonly ClashFacts[]): DifferRow[] {
  if (plans.length < 2) return []
  const two = plans.length === 2
  const ends = plans.map(p => p.endMin), lengths = plans.map(p => p.lengthMin)
  // Between two plans each side names the gap. Among more, the earliest and the shortest are the marks.
  const gap = (value: number, all: readonly number[], more: string, less: string, mark: string) => {
    const least = Math.min(...all)
    if (value > least) return `${spanText(value - least)} ${more}`
    return two ? `${spanText(Math.max(...all) - least)} ${less}` : mark
  }
  const sharedTags = plans[0].tags.map(tidy).filter(tag => tag && plans.every(p => p.tags.some(t => same(tidy(t)) === same(tag))))
  const cellOf: Record<DifferKey, (p: ClashFacts) => string> = {
    ends: p => gap(p.endMin, ends, 'later', 'sooner', 'first'),
    length: p => gap(p.lengthMin, lengths, 'longer', 'shorter', 'shortest'),
    overlap: p => tidy(p.overlap) || DIFFER_NONE,
    walk: p => tidy(p.walk) || DIFFER_WALK_UNKNOWN,
    going: p => tidy(p.going) || DIFFER_NONE,
    tags: p => [...new Set(p.tags.map(tidy).filter(Boolean))].filter(tag => !sharedTags.some(s => same(s) === same(tag))).join(', ') || DIFFER_NONE,
  }
  // Ends and Length are judged on the minutes themselves, the rest on the words shown.
  const differs: Record<DifferKey, (cells: string[]) => boolean> = {
    ends: () => new Set(ends).size > 1,
    length: () => new Set(lengths).size > 1,
    overlap: cells => cells.some(c => same(c) !== same(cells[0])),
    walk: cells => cells.some(c => same(c) !== same(cells[0])),
    going: cells => cells.some(c => same(c) !== same(cells[0])),
    tags: cells => cells.some(c => c !== DIFFER_NONE),
  }
  return DIFFER_ORDER.flatMap(({ key, label }) => {
    const cells = plans.map(cellOf[key])
    return differs[key](cells) ? [{ key, label, cells }] : []
  })
}

/** Friends going, as a short cell: "Maya", "Maya + 2 friends". Null when no friend chose to show. */
export function goingCell(going: GoingModel | null | undefined): string | null {
  const names = going?.friends ?? []
  if (!names.length) return null
  const others = names.length - 1
  return others ? `${names[0]} + ${others} ${others === 1 ? 'friend' : 'friends'}` : names[0]
}

/** The walk to a plan from the plan before it that day. Null when there is no plan before it or the map cannot say. */
export function walkFromPlanBefore(event: ScreenEvent, dayPlans: readonly ScreenEvent[]): string | null {
  const { before } = neighbours(event, dayPlans)
  if (!before) return null
  const walk = walkBetween(before.location, event.location)
  if (walk.status !== 'ready') return null
  return walk.minutes === 0 ? `Same building as ${before.title}` : `${walk.minutes} min from ${before.title}`
}

export type ClashPlan = {
  id: string
  title: string
  host: string
  location: string
  time: string
  /** Minutes of this plan that overlap any other plan in the clash. */
  overlapText: string
  conflictingIds: string[]
  /** Bar position on the shared ruler, in percent. */
  left: number
  width: number
  live: boolean
  category: string
  /** The plan as the same ticket Discover and My Schedule draw (Nov 24). */
  stub: StubModel
  /** Titles of the plans "Keep this one" removes, earliest first. */
  removes: string[]
  /** This plan's own facts, ready for whatDiffers. Who is going is added by the page that knows your groups. */
  facts: ClashFacts
}
export type ClashModel = {
  /** Stable key: the date plus the earliest start. */
  key: string
  date: string
  dayLabel: string
  summary: string
  /** "3pm", when the clash begins. */
  startText: string
  plans: ClashPlan[]
  /** Where the plans overlap each other, on the same ruler. */
  overlaps: { left: number; width: number; label: string }[]
  ticks: { left: number; label: string }[]
}

const toMin = (t: string) => toMinutes(t) ?? NaN
const clock = clockText
const span = clockSpan
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** The strip shows at most this many gaps between hour marks, so five labels fit under it on a small phone. */
export const MAX_TICK_GAPS = 4

type Timed = { e: ScreenEvent; a: number; b: number }

/** Every clash among these plans, earliest first. Plans without clean times are left out. */
export function presentClashes(events: readonly ScreenEvent[], now: Date = new Date()): ClashModel[] {
  const today = campusNow(now)
  const timed: Timed[] = events.flatMap(e => {
    if (!e.start || !e.end) return []
    const a = toMin(e.start), b = toMin(e.end)
    return b > a ? [{ e, a, b }] : []
  }).sort((x, y) => x.e.date.localeCompare(y.e.date) || x.a - y.a || x.b - y.b)

  const groups: Timed[][] = []
  for (const t of timed) {
    const g = groups[groups.length - 1]
    if (g && g[0].e.date === t.e.date && t.a < Math.max(...g.map(x => x.b))) g.push(t)
    else groups.push([t])
  }

  return groups.filter(g => g.length > 1).map(g => {
    const date = g[0].e.date
    const from = Math.floor(Math.min(...g.map(t => t.a)) / 60) * 60
    // At most five hour marks, so their labels never run into each other on a phone.
    // A longer clash is marked every 2, 3 or more hours, and the strip ends on a mark.
    const hours = Math.ceil((Math.max(...g.map(t => t.b)) - from) / 60)
    const tickStep = Math.ceil(hours / MAX_TICK_GAPS) * 60
    const to = from + Math.ceil(hours * 60 / tickStep) * tickStep
    const pct = (m: number) => Math.round(((m - from) / (to - from)) * 10000) / 100
    const pairs: { a: number; b: number }[] = []
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = Math.max(g[i].a, g[j].a), b = Math.min(g[i].b, g[j].b)
      if (a < b) pairs.push({ a, b })
    }
    // Merge the overlapping stretches so the ruler shows each once.
    const merged = pairs.sort((x, y) => x.a - y.a).reduce<{ a: number; b: number }[]>((out, p) => {
      const last = out[out.length - 1]
      if (last && p.a <= last.b) last.b = Math.max(last.b, p.b); else out.push({ ...p })
      return out
    }, [])
    const plans = g.map(t => {
      const conflictingIds = g.filter(other => other !== t && t.a < other.b && other.a < t.b)
        .map(other => other.e.id)
      // The same rule as the plan's card on My Schedule, so both say the same length.
      const over = overlapMinutes(t.e, g.map(other => other.e))
      const nowMin = toMin(today.time)
      const stub = presentBrowseDetail(t.e, [], now)
      return {
        id: t.e.id, title: t.e.title, host: t.e.hostName ?? '', location: t.e.location ?? '',
        time: span(t.a, t.b), overlapText: `${spanText(over)} overlap`, conflictingIds,
        left: pct(t.a), width: pct(t.b) - pct(t.a),
        live: date === today.date && nowMin >= t.a && nowMin < t.b,
        category: categoryOfPlan({ title: t.e.title, host: t.e.hostName ?? '' }),
        stub,
        removes: g.filter(other => conflictingIds.includes(other.e.id)).map(other => other.e.title),
        facts: {
          endMin: t.b, lengthMin: t.b - t.a, overlap: spanText(over),
          walk: walkFromPlanBefore(t.e, events), tags: stub.tagLabels ?? [],
        },
      }
    })
    const [y, m, d] = date.split('-').map(Number)
    const dayLabel = date === today.date ? 'Today' : `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${m}/${d}`
    const ticks: { left: number; label: string }[] = []
    for (let h = from; h <= to; h += tickStep) ticks.push({ left: pct(h), label: clock(h) })
    return {
      key: `${date}-${g[0].a}`, date, dayLabel,
      startText: clock(Math.min(...g.map(t => t.a))),
      summary: `${g.length} plans, ${span(Math.min(...g.map(t => t.a)), Math.max(...g.map(t => t.b)))}`,
      plans, ticks,
      overlaps: merged.map(o => ({ left: pct(o.a), width: pct(o.b) - pct(o.a), label: span(o.a, o.b) })),
    }
  })
}
