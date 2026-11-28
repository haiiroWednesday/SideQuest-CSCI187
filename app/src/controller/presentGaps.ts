// CONTROLLER: today's free gaps, read from the student's own plans (and later their calendar).
// The view draws the ruler from the percentages here; it never does time math itself.
import { clockText, hhmmOf, toMinutes, type LegacyCampusEvent } from '../model/events'
import { campusNow } from '../model/eventCatalog'

export type GapPart = 'now' | 'afternoon' | 'tonight'
export type Gap = {
  id: string
  start: string
  end: string
  label: string
  name: string
  minutes: number
  parts: GapPart[]
  left: number
  width: number
}
export type BusyBlock = { left: number; width: number }
export type GapsModel = {
  date: string
  gaps: Gap[]
  busy: BusyBlock[]
  ticks: { left: number; label: string }[]
  stamp: { dow: string; day: number; month: string; year: number }
}

const DAY_START = 8 * 60
const DAY_END = 23 * 60
const MIN_GAP = 45

const toMin = (t: string) => toMinutes(t) ?? NaN
const toHHMM = hhmmOf
const short = (m: number) => clockText(m, false)
const pct = (m: number) => Math.round(((m - DAY_START) / (DAY_END - DAY_START)) * 1000) / 10

export function presentGaps(input: { events: readonly LegacyCampusEvent[]; plannedIds: readonly string[]; now?: Date }): GapsModel {
  const campus = campusNow(input.now ?? new Date())
  const nowMin = toMin(campus.time)
  const planned = new Set(input.plannedIds)
  const blocks = input.events
    .filter(e => planned.has(e.id) && e.date === campus.date)
    .map(e => [Math.max(toMin(e.start), DAY_START), Math.min(toMin(e.end), DAY_END)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0])
  const merged: [number, number][] = []
  for (const [a, b] of blocks) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  const gaps: Gap[] = []
  let cursor = Math.max(DAY_START, nowMin)
  const edges = [...merged, [DAY_END, DAY_END] as [number, number]]
  for (const [a, b] of edges) {
    const start = cursor, end = Math.min(a, DAY_END)
    if (end - start >= MIN_GAP) {
      const parts: GapPart[] = []
      if (start <= nowMin + 30) parts.push('now')
      if (start < 17 * 60 && end > 12 * 60) parts.push('afternoon')
      if (end > 17 * 60) parts.push('tonight')
      const hours = (end - start) / 60
      gaps.push({
        id: `${toHHMM(start)}-${toHHMM(end)}`, start: toHHMM(start), end: toHHMM(end),
        label: `${short(start)}–${short(end)}`,
        name: start >= 17 * 60 ? 'tonight' : start < 13 * 60 && end <= 14 * 60 ? 'lunch gap' : hours >= 2 ? 'a long stretch' : 'a short gap',
        minutes: end - start, parts, left: pct(start), width: pct(end) - pct(start),
      })
    }
    cursor = Math.max(cursor, b)
  }
  const ticks = [9, 12, 15, 18, 21].map(h => ({ left: pct(h * 60), label: h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}` }))
  const d = new Date(campus.date + 'T12:00:00Z')
  const stamp = { dow: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getUTCDay()], day: d.getUTCDate(), year: d.getUTCFullYear(), month: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()] }
  return { stamp, date: campus.date, gaps, busy: merged.map(([a, b]) => ({ left: pct(a), width: pct(b) - pct(a) })), ticks }
}

/** Gaps that belong to any of the chosen parts of the day. */
export function gapsForParts(model: GapsModel, parts: readonly GapPart[]): Gap[] {
  return parts.length ? model.gaps.filter(g => g.parts.some(p => parts.includes(p))) : []
}

/** Where a picked window sits on today's ruler, or null when it is incomplete, on another day or empty. */
export function pickedBand(model: GapsModel, window: { date: string; start: string; end: string }): { left: number; width: number; label: string } | null {
  if (!window.date || !window.start || !window.end || window.date !== model.date) return null
  const a = Math.max(toMin(window.start), DAY_START), b = Math.min(toMin(window.end), DAY_END)
  if (b <= a) return null
  const fmt = (m: number) => clockText(m, false)
  return { left: pct(a), width: pct(b) - pct(a), label: `${fmt(a)}–${fmt(b)}` }
}
