// CONTROLLER: free time on Discover.
// SideQuest manages free time; people only tell it when they are busy. The day is cut into
// half hours from 8am to 11pm. My Schedule's plans are busy already. A student adds more busy time
// by typing a from–until time, or by marking a whole gap "Busy then". Every run of the half hours
// that are left (at least an hour long) is a free gap, and Discover shows the events that fit inside one.
// One choice says when to look: this week (every gap), now, this afternoon or tonight.
// Views never do this time math: they render the model and report drags, taps and typed times.
import type { LegacyCampusEvent } from '../model/events'
import { campusNow } from '../model/eventCatalog'

export const CELL = 30
export const DAY_START = 8 * 60
export const DAY_END = 23 * 60
export const CELLS = (DAY_END - DAY_START) / CELL
const WEEK = 7
const MIN_GAP_CELLS = 2

/** Half hours the student marked busy, by campus date. Each list is sorted and has no repeats. */
export type FreeMarks = Readonly<Record<string, readonly number[]>>
export type Shortcut = 'now' | 'afternoon' | 'tonight'
export type When = 'week' | Shortcut
export type CellState = 'past' | 'busy' | 'mine' | 'free'

export type MarkDay = { date: string; dow: string; day: number; month: string; today: boolean; marked: number; selected: boolean }
export type MarkWindow = { date: string; start: string; end: string; label: string; dayLabel: string; first: number; last: number }
export type MarkCell = { i: number; state: CellState; label: string }
export type MarkRun = { first: number; last: number; left: number; width: number; label: string }
export type MarkModel = {
  days: MarkDay[]
  date: string
  cells: MarkCell[]
  busy: MarkRun[]
  mine: MarkRun[]
  free: MarkRun[]
  windows: MarkWindow[]
  ticks: { left: number; label: string }[]
  shortcuts: { key: When; label: string; on: boolean }[]
  /** Said under the choice when "Now" had to look ahead, or today has no free time left. */
  whenNote: string | null
  stamp: { dow: string; day: number; month: string; year: number }
}
export type MarkInput = { events: readonly LegacyCampusEvent[]; plannedIds: readonly string[]; now: Date; marks: FreeMarks; when?: When; date?: string }

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const cellStart = (i: number) => DAY_START + i * CELL
const pct = (i: number) => Math.round((i / CELLS) * 10000) / 100

export function clock(m: number, withSuffix = true): string {
  const h = Math.floor(m / 60), mm = m % 60, h12 = h % 12 || 12
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${withSuffix ? (h < 12 ? 'am' : 'pm') : ''}`
}
export function span(a: number, b: number): string {
  return `${clock(a, (a < 720) !== (b < 720))}–${clock(b)}`
}
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d, w: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}
function scheduleCells(input: MarkInput, date: string): Set<number> {
  const planned = new Set(input.plannedIds), out = new Set<number>()
  for (const e of input.events) {
    if (!planned.has(e.id) || e.date !== date || !e.start || !e.end) continue
    const a = toMin(e.start), b = toMin(e.end)
    for (let i = 0; i < CELLS; i++) if (cellStart(i) < b && cellStart(i) + CELL > a) out.add(i)
  }
  return out
}
function pastCells(date: string, now: Date): Set<number> {
  const campus = campusNow(now), out = new Set<number>()
  if (date < campus.date) { for (let i = 0; i < CELLS; i++) out.add(i); return out }
  if (date > campus.date) return out
  const n = toMin(campus.time)
  for (let i = 0; i < CELLS; i++) if (cellStart(i) + CELL <= n) out.add(i)
  return out
}
function runsOf(cells: Iterable<number>): [number, number][] {
  const out: [number, number][] = []
  for (const i of [...cells].sort((a, b) => a - b)) {
    const last = out[out.length - 1]
    if (last && i === last[1] + 1) last[1] = i
    else out.push([i, i])
  }
  return out
}
const PART_RANGE: Record<Shortcut, (nowCell: number) => [number, number]> = {
  now: n => [n, Math.min(CELLS - 1, n + 3)],
  afternoon: () => [(12 * 60 - DAY_START) / CELL, (17 * 60 - DAY_START) / CELL - 1],
  tonight: () => [(17 * 60 - DAY_START) / CELL, CELLS - 1],
}

/** The free half hours of one day: not over, not in My Schedule, not marked busy. */
function freeCells(input: MarkInput, date: string): Set<number> {
  const past = pastCells(date, input.now), sched = scheduleCells(input, date), mine = new Set(input.marks[date] ?? [])
  const out = new Set<number>()
  for (let i = 0; i < CELLS; i++) if (!past.has(i) && !sched.has(i) && !mine.has(i)) out.add(i)
  return out
}
function gapsOf(input: MarkInput, date: string): [number, number][] {
  return runsOf(freeCells(input, date)).filter(([a, b]) => b - a + 1 >= MIN_GAP_CELLS)
}

/** Today's free time for one choice. "Now" means the gap you're in, or the next one if you're busy. */
function todayFor(input: MarkInput, when: Shortcut): { runs: [number, number][]; note: string | null } {
  const nowCell = Math.max(0, Math.floor((toMin(campusNow(input.now).time) - DAY_START) / CELL))
  const free = freeCells(input, campusNow(input.now).date)
  if (when === 'now') {
    const run = runsOf(free).find(([, b]) => b >= nowCell)
    if (!run) return { runs: [], note: 'No free time left today' }
    const a = Math.max(run[0], nowCell)
    return { runs: [[a, run[1]]], note: a > nowCell ? `Busy now. Free at ${clock(cellStart(a))}` : null }
  }
  const [a, b] = PART_RANGE[when](nowCell)
  const keep = [...free].filter(i => i >= a && i <= b)
  return keep.length ? { runs: runsOf(keep), note: null } : { runs: [], note: `No free time ${when === 'afternoon' ? 'this afternoon' : 'tonight'}` }
}

/** The free gaps Discover filters by: every gap this week, or today's for the chosen time. */
export function freeWindows(input: MarkInput): { date: string; start: string; end: string }[] {
  const today = campusNow(input.now).date
  const when = input.when ?? 'week'
  if (when !== 'week') return todayFor(input, when).runs.map(([a, b]) => ({ date: today, start: hhmm(cellStart(a)), end: hhmm(cellStart(b + 1)) }))
  return [...Array(WEEK).keys()].flatMap(k => {
    const date = addDays(today, k)
    return gapsOf(input, date).map(([a, b]) => ({ date, start: hhmm(cellStart(a)), end: hhmm(cellStart(b + 1)) }))
  })
}

export function presentMarks(input: MarkInput): MarkModel {
  const campus = campusNow(input.now), today = campus.date
  const date = input.date && input.date >= today && input.date <= addDays(today, WEEK - 1) ? input.date : today
  const days: MarkDay[] = [...Array(WEEK).keys()].map(k => {
    const d = addDays(today, k), p = parts(d)
    return { date: d, dow: k === 0 ? 'Today' : DOW[p.w], day: p.d, month: MON[p.m - 1], today: k === 0, marked: (input.marks[d] ?? []).length, selected: d === date }
  })
  const past = pastCells(date, input.now), sched = scheduleCells(input, date), mine = new Set(input.marks[date] ?? [])
  const cells: MarkCell[] = [...Array(CELLS).keys()].map(i => {
    const state: CellState = past.has(i) ? 'past' : sched.has(i) ? 'busy' : mine.has(i) ? 'mine' : 'free'
    return { i, state, label: `${span(cellStart(i), cellStart(i) + CELL)}, ${state === 'past' ? 'already over' : state === 'busy' ? 'in My Schedule' : state === 'mine' ? 'you said busy' : 'free'}` }
  })
  const toRun = ([a, b]: [number, number]): MarkRun => ({ first: a, last: b, left: pct(a), width: pct(b + 1) - pct(a), label: span(cellStart(a), cellStart(b + 1)) })
  const d = days.find(x => x.selected)!
  const windows = gapsOf(input, date).map(([a, b]) => ({ date, first: a, last: b, start: hhmm(cellStart(a)), end: hhmm(cellStart(b + 1)), label: span(cellStart(a), cellStart(b + 1)), dayLabel: d.today ? 'Today' : `${d.dow} ${d.day}` }))
  const p = parts(today), when = input.when ?? 'week'
  const shortcuts = (['week', 'now', 'afternoon', 'tonight'] as When[]).map(key => ({
    key, on: key === when,
    label: key === 'week' ? 'This week' : key === 'now' ? 'Now' : key === 'afternoon' ? 'This afternoon' : 'Tonight',
  }))
  const whenNote = when === 'week' ? null : todayFor(input, when).note
  return {
    days, date, cells, windows, shortcuts, whenNote,
    busy: runsOf([...sched].filter(i => !past.has(i))).map(toRun),
    mine: runsOf([...mine].filter(i => !past.has(i) && !sched.has(i))).map(toRun),
    free: gapsOf(input, date).map(toRun),
    ticks: [9, 12, 15, 18, 21].map(h => ({ left: pct((h * 60 - DAY_START) / CELL), label: h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm` })),
    stamp: { dow: DOW_LONG[p.w], day: p.d, month: MON[p.m - 1].toUpperCase(), year: p.y },
  }
}

/** Paints busy time across a drag, from the marks as they were when the drag began. */
export function paintMarks(input: MarkInput & { date: string }, from: number, to: number, add: boolean): FreeMarks {
  const set = new Set(input.marks[input.date] ?? []), sched = scheduleCells(input, input.date), past = pastCells(input.date, input.now)
  const [a, b] = from <= to ? [from, to] : [to, from]
  for (let i = Math.max(0, a); i <= Math.min(CELLS - 1, b); i++) {
    if (sched.has(i) || past.has(i)) continue
    if (add) set.add(i); else set.delete(i)
  }
  return withDay(input.marks, input.date, [...set])
}

/** Typed busy time, "15:00" to "16:30". Returns null when the times make no sense, so the form can say so. */
export function addBusy(input: MarkInput & { date: string }, start: string, end: string): FreeMarks | null {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null
  const a = toMin(start), b = toMin(end)
  if (b <= a) return null
  const first = Math.max(0, Math.floor((a - DAY_START) / CELL)), last = Math.min(CELLS - 1, Math.ceil((b - DAY_START) / CELL) - 1)
  if (last < first) return null
  return paintMarks(input, first, last, true)
}

/** "I'm busy then": the whole free gap becomes busy. */
export function fillGap(input: MarkInput, w: Pick<MarkWindow, 'date' | 'first' | 'last'>): FreeMarks {
  return paintMarks({ ...input, date: w.date }, w.first, w.last, true)
}


function withDay(marks: FreeMarks, date: string, cells: number[]): FreeMarks {
  const next: Record<string, readonly number[]> = { ...marks }
  const sorted = [...new Set(cells)].sort((a, b) => a - b)
  if (sorted.length) next[date] = sorted; else delete next[date]
  return next
}
