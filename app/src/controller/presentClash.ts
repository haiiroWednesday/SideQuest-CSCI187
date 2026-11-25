// CONTROLLER: a clash, laid out so a student can weigh it and decide.
// Plans that overlap (directly or through a chain) form one clash. The sheet draws them on one
// shared time ruler, so the overlap is visible at a glance, and lists what each plan asks of you.
import { campusNow } from '../model/eventCatalog'
import { clockSpan, clockText, toMinutes } from '../model/events'
import { overlapMinutes } from '../model/eventTiming'
import { presentBrowseDetail, spanText, type ScreenEvent, type StubModel } from './screenModels'
import { categoryOfPlan } from './eventCategory'

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
    const to = Math.ceil(Math.max(...g.map(t => t.b)) / 60) * 60
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
      return {
        id: t.e.id, title: t.e.title, host: t.e.hostName ?? '', location: t.e.location ?? '',
        time: span(t.a, t.b), overlapText: `${spanText(over)} overlap`, conflictingIds,
        left: pct(t.a), width: pct(t.b) - pct(t.a),
        live: date === today.date && nowMin >= t.a && nowMin < t.b,
        category: categoryOfPlan({ title: t.e.title, host: t.e.hostName ?? '' }),
        stub: presentBrowseDetail(t.e, [], now),
      }
    })
    const [y, m, d] = date.split('-').map(Number)
    const dayLabel = date === today.date ? 'Today' : `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${m}/${d}`
    const ticks: { left: number; label: string }[] = []
    for (let h = from; h <= to; h += 60) ticks.push({ left: pct(h), label: clock(h) })
    return {
      key: `${date}-${g[0].a}`, date, dayLabel,
      startText: clock(Math.min(...g.map(t => t.a))),
      summary: `${g.length} plans, ${span(Math.min(...g.map(t => t.a)), Math.max(...g.map(t => t.b)))}`,
      plans, ticks,
      overlaps: merged.map(o => ({ left: pct(o.a), width: pct(o.b) - pct(o.a), label: span(o.a, o.b) })),
    }
  })
}
