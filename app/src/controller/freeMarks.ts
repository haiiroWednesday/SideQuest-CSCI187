// CONTROLLER: free time on Discover.
// The day is cut into five-minute steps from 8am to 11pm. My Schedule's plans are busy already.
// A student tells SideQuest about the rest in one of two ways (the Busy/Free switch, Nov 25):
//   Busy: mark when you're busy. Every run of steps that is left (at least an hour long) is free.
//   Free: mark when you ARE free, to the minute (1:10 to 1:55). Only those stretches are free.
// Discover shows the events that fit fully inside a free stretch. My Schedule reads the same
// stretches, so the two pages never disagree about when you are free.
// Views never do this time math: they render the model and report drags, taps and typed times.
import { clockSpan, clockText, hhmmOf, toMinutes, type LegacyCampusEvent } from '../model/events'
import { campusNow } from '../model/eventCatalog'

/** Minutes in one step of the bar. Drags and typed times land on these. */
export const CELL = 5
export const DAY_START = 8 * 60
export const DAY_END = 23 * 60
export const CELLS = (DAY_END - DAY_START) / CELL
const HOUR = 60 / CELL
const WEEK = 7
/** In Busy mode a free gap is what is left over, so it must be worth going to: an hour or more. */
const MIN_GAP_CELLS = HOUR

/** Steps the student marked, by campus date. Each list is sorted and has no repeats. */
export type FreeMarks = Readonly<Record<string, readonly number[]>>
/** What the marks on the bar mean: time you're busy, or time you're free. */
export type MarkMode = 'busy' | 'free'
export type Shortcut = 'now' | 'afternoon' | 'tonight'
export type When = 'week' | Shortcut
/** 'unset' is a step nobody marked in Free mode: not known to be free. */
export type CellState = 'past' | 'busy' | 'mine' | 'free' | 'unset'

export type MarkDay = { date: string; dow: string; day: number; month: string; today: boolean; marked: number; selected: boolean }
export type MarkWindow = { date: string; start: string; end: string; label: string; dayLabel: string; first: number; last: number }
export type MarkCell = { i: number; state: CellState; label: string }
export type MarkRun = { first: number; last: number; left: number; width: number; label: string }
export type MarkModel = {
  mode: MarkMode
  days: MarkDay[]
  date: string
  cells: MarkCell[]
  busy: MarkRun[]
  /** The stretches the student drew in the current mode: busy blocks, or free blocks in Free mode. */
  mine: MarkRun[]
  free: MarkRun[]
  windows: MarkWindow[]
  ticks: { left: number; label: string }[]
  shortcuts: { key: When; label: string; on: boolean }[]
  /** Said under the choice when "Now" had to look ahead, or today has no free time left. */
  whenNote: string | null
  stamp: { dow: string; day: number; month: string; year: number }
}
export type MarkInput = {
  events: readonly LegacyCampusEvent[]
  plannedIds: readonly string[]
  now: Date
  /** Busy time the student marked. */
  marks: FreeMarks
  /** Free time the student marked in Free mode. */
  open?: FreeMarks
  mode?: MarkMode
  when?: When
  date?: string
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const toMin = (t: string) => toMinutes(t) ?? NaN
/** The step's start, in minutes after midnight. */
export const cellStart = (i: number) => DAY_START + i * CELL
const pct = (i: number) => Math.round((i / CELLS) * 10000) / 100

/** Kept for callers that already import these names; both are the model's one 12-hour clock. */
export const clock = clockText
export const span = clockSpan

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d, w: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}
/** Steps that touch [a, b) minutes. */
function cellsTouching(a: number, b: number): number[] {
  const out: number[] = []
  for (let i = 0; i < CELLS; i++) if (cellStart(i) < b && cellStart(i) + CELL > a) out.push(i)
  return out
}
function scheduleCells(input: MarkInput, date: string): Set<number> {
  const planned = new Set(input.plannedIds), out = new Set<number>()
  for (const e of input.events) {
    if (!planned.has(e.id) || e.date !== date || !e.start || !e.end) continue
    for (const i of cellsTouching(toMin(e.start), toMin(e.end))) out.add(i)
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
  now: n => [n, Math.min(CELLS - 1, n + 2 * HOUR - 1)],
  afternoon: () => [(12 * 60 - DAY_START) / CELL, (17 * 60 - DAY_START) / CELL - 1],
  tonight: () => [(17 * 60 - DAY_START) / CELL, CELLS - 1],
}
const modeOf = (input: MarkInput): MarkMode => input.mode ?? 'busy'
/** The steps the student draws in the current mode. */
export function drawnMarks(input: MarkInput): FreeMarks {
  return modeOf(input) === 'free' ? input.open ?? {} : input.marks
}

/** The free steps of one day: not over, not in My Schedule, and either not marked busy (Busy mode) or marked free (Free mode). */
function freeCells(input: MarkInput, date: string): Set<number> {
  const past = pastCells(date, input.now), sched = scheduleCells(input, date)
  const free = modeOf(input) === 'free'
  const marked = new Set((free ? input.open?.[date] : input.marks[date]) ?? [])
  const out = new Set<number>()
  for (let i = 0; i < CELLS; i++) if (!past.has(i) && !sched.has(i) && marked.has(i) === free) out.add(i)
  return out
}
function gapsOf(input: MarkInput, date: string): [number, number][] {
  // Free mode: the student said exactly when they are free, so even 45 minutes counts.
  const least = modeOf(input) === 'free' ? 1 : MIN_GAP_CELLS
  return runsOf(freeCells(input, date)).filter(([a, b]) => b - a + 1 >= least)
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

/** The free stretches Discover filters by: every one this week, or today's for the chosen time. */
export function freeWindows(input: MarkInput): { date: string; start: string; end: string }[] {
  const today = campusNow(input.now).date
  const when = input.when ?? 'week'
  if (when !== 'week') return todayFor(input, when).runs.map(([a, b]) => ({ date: today, start: hhmmOf(cellStart(a)), end: hhmmOf(cellStart(b + 1)) }))
  return [...Array(WEEK).keys()].flatMap(k => {
    const date = addDays(today, k)
    return gapsOf(input, date).map(([a, b]) => ({ date, start: hhmmOf(cellStart(a)), end: hhmmOf(cellStart(b + 1)) }))
  })
}

/** True once the student has said anything about their time in the current mode. */
export function hasTold(input: Pick<MarkInput, 'marks' | 'open' | 'mode' | 'when'>): boolean {
  const drawn = (input.mode ?? 'busy') === 'free' ? input.open ?? {} : input.marks
  return Object.keys(drawn).length > 0 || (input.when ?? 'week') !== 'week'
}

/** One day's own time for My Schedule, from the same marks Discover draws: what the student
 *  marked (busy or free) and how many free minutes lie between two clock times. */
export type DayTime = {
  mode: MarkMode
  /** The student's stretches that are still ahead, outside My Schedule: "Busy 1–2:30pm" or "Free 1:10–1:55pm". */
  marked: { from: number; to: number; label: string }[]
}
export function dayTime(input: MarkInput, date: string): DayTime {
  const mode = modeOf(input)
  const past = pastCells(date, input.now), sched = scheduleCells(input, date)
  const drawn = new Set((mode === 'free' ? input.open?.[date] : input.marks[date]) ?? [])
  const marked = runsOf([...drawn].filter(i => !past.has(i) && !sched.has(i))).map(([a, b]) => {
    const from = cellStart(a), to = cellStart(b + 1)
    return { from, to, label: `${mode === 'free' ? 'Free' : 'Busy'} ${span(from, to)}` }
  })
  return { mode, marked }
}
/** Free minutes between two times on a day, by the same rule Discover filters with. */
export function freeMinutesBetween(input: MarkInput, date: string, from: number, to: number): number {
  const free = freeCells(input, date)
  let minutes = 0
  for (const i of free) minutes += Math.max(0, Math.min(to, cellStart(i) + CELL) - Math.max(from, cellStart(i)))
  return minutes
}

export function presentMarks(input: MarkInput): MarkModel {
  const campus = campusNow(input.now), today = campus.date
  const mode = modeOf(input)
  const drawn = drawnMarks(input)
  const date = input.date && input.date >= today && input.date <= addDays(today, WEEK - 1) ? input.date : today
  const days: MarkDay[] = [...Array(WEEK).keys()].map(k => {
    const d = addDays(today, k), p = parts(d)
    return { date: d, dow: k === 0 ? 'Today' : DOW[p.w], day: p.d, month: MON[p.m - 1], today: k === 0, marked: (drawn[d] ?? []).length, selected: d === date }
  })
  const past = pastCells(date, input.now), sched = scheduleCells(input, date), mine = new Set(drawn[date] ?? [])
  const said = mode === 'free' ? 'you said free' : 'you said busy'
  const cells: MarkCell[] = [...Array(CELLS).keys()].map(i => {
    const state: CellState = past.has(i) ? 'past' : sched.has(i) ? 'busy' : mine.has(i) ? 'mine' : mode === 'free' ? 'unset' : 'free'
    const what = state === 'past' ? 'already over' : state === 'busy' ? 'in My Schedule' : state === 'mine' ? said : state === 'unset' ? 'not marked' : 'free'
    return { i, state, label: `${span(cellStart(i), cellStart(i) + CELL)}, ${what}` }
  })
  const toRun = ([a, b]: [number, number]): MarkRun => ({ first: a, last: b, left: pct(a), width: pct(b + 1) - pct(a), label: span(cellStart(a), cellStart(b + 1)) })
  const d = days.find(x => x.selected)!
  const windows = gapsOf(input, date).map(([a, b]) => ({ date, first: a, last: b, start: hhmmOf(cellStart(a)), end: hhmmOf(cellStart(b + 1)), label: span(cellStart(a), cellStart(b + 1)), dayLabel: d.today ? 'Today' : `${d.dow} ${d.day}` }))
  const p = parts(today), when = input.when ?? 'week'
  const shortcuts = (['week', 'now', 'afternoon', 'tonight'] as When[]).map(key => ({
    key, on: key === when,
    label: key === 'week' ? 'This week' : key === 'now' ? 'Now' : key === 'afternoon' ? 'This afternoon' : 'Tonight',
  }))
  const whenNote = when === 'week' ? null : todayFor(input, when).note
  return {
    mode, days, date, cells, windows, shortcuts, whenNote,
    busy: runsOf([...sched].filter(i => !past.has(i))).map(toRun),
    mine: runsOf([...mine].filter(i => !past.has(i) && !sched.has(i))).map(toRun),
    free: gapsOf(input, date).map(toRun),
    ticks: [9, 12, 15, 18, 21].map(h => ({ left: pct((h * 60 - DAY_START) / CELL), label: h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm` })),
    stamp: { dow: DOW_LONG[p.w], day: p.d, month: MON[p.m - 1].toUpperCase(), year: p.y },
  }
}

/** Paints `input.marks` (the set being drawn) across a drag. My Schedule steps and past steps never change. */
export function paintMarks(input: MarkInput & { date: string }, from: number, to: number, add: boolean): FreeMarks {
  const set = new Set(input.marks[input.date] ?? []), sched = scheduleCells(input, input.date), past = pastCells(input.date, input.now)
  const [a, b] = from <= to ? [from, to] : [to, from]
  for (let i = Math.max(0, a); i <= Math.min(CELLS - 1, b); i++) {
    if (sched.has(i) || past.has(i)) continue
    if (add) set.add(i); else set.delete(i)
  }
  return withDay(input.marks, input.date, [...set])
}

/** Typed time, "13:10" to "13:55", onto `input.marks`. Returns null when the times make no sense, so the form can say so. */
export function addBusy(input: MarkInput & { date: string }, start: string, end: string): FreeMarks | null {
  const a = toMinutes(start), b = toMinutes(end)
  if (a === null || b === null || b <= a) return null
  const first = Math.max(0, Math.floor((a - DAY_START) / CELL)), last = Math.min(CELLS - 1, Math.ceil((b - DAY_START) / CELL) - 1)
  if (last < first) return null
  return paintMarks(input, first, last, true)
}

/** A drag on the day bar: the old stretch (if any) is lifted and the new one is laid down.
 *  My Schedule steps and past steps never change, the same as paintMarks. */
export function reshapeBusy(input: MarkInput & { date: string }, from: { first: number; last: number } | null, first: number, last: number): FreeMarks {
  const lifted = from ? paintMarks(input, from.first, from.last, false) : input.marks
  return paintMarks({ ...input, marks: lifted }, first, last, true)
}

/** "I'm busy then": the whole free gap becomes busy. */
export function fillGap(input: MarkInput, w: Pick<MarkWindow, 'date' | 'first' | 'last'>): FreeMarks {
  return paintMarks({ ...input, date: w.date }, w.first, w.last, true)
}

/** The step a pointer at `x` is over, on a bar `width` wide starting at `left`. Lands on whole five-minute steps. */
export function cellAtX(x: number, left: number, width: number): number {
  return Math.max(0, Math.min(CELLS - 1, Math.floor(((x - left) / width) * CELLS)))
}
/** A tap with no drag marks this many steps: one hour. */
export const TAP_CELLS = HOUR

/**
 * Takes back one change (`before` → `after`) from `current`, leaving every step that changed
 * since alone. A refused save undoes only its own change, never a newer one.
 */
export function undoChange(current: FreeMarks, before: FreeMarks, after: FreeMarks): FreeMarks {
  const next: Record<string, readonly number[]> = { ...current }
  const dates = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const date of dates) {
    const was = new Set(before[date] ?? []), now = new Set(after[date] ?? []), cur = new Set(current[date] ?? [])
    for (const i of now) if (!was.has(i) && cur.has(i)) cur.delete(i)
    for (const i of was) if (!now.has(i) && !cur.has(i)) cur.add(i)
    const sorted = [...cur].sort((a, b) => a - b)
    if (sorted.length) next[date] = sorted; else delete next[date]
  }
  return next
}

function withDay(marks: FreeMarks, date: string, cells: number[]): FreeMarks {
  const next: Record<string, readonly number[]> = { ...marks }
  const sorted = [...new Set(cells)].sort((a, b) => a - b)
  if (sorted.length) next[date] = sorted; else delete next[date]
  return next
}
