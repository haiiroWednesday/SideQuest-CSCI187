// MODEL: busy time from a calendar file (.ics), the iCal adapter of the BusySource port.
// The file is read in the browser and never uploaded. Only start and end times leave this
// module as busy marks; event titles appear in the confirm list and are then dropped.
// Handles: folded lines, UTC, TZID and floating times, all-day events, multi-day events,
// weekly and daily repeats (INTERVAL, BYDAY, UNTIL, COUNT), EXDATE, moved single
// occurrences (RECURRENCE-ID), cancelled and "show as free" events.
import { checkProposals, type BusyImport, type BusyProposal, type BusyRange, type BusySource } from './busyImport'
import { CAMPUS_TIME_ZONE } from './eventCatalog'

export const MAX_ICS_BYTES = 2_000_000
const MAX_STEPS = 4000

type Prop = { name: string; params: Record<string, string>; value: string }
type Stamp = { y: number; m: number; d: number; h: number; mi: number; zone: 'utc' | 'floating' | string; allDay: boolean }
type Vevent = {
  uid: string; summary: string; start: Stamp; end: Stamp | null; duration: number | null
  rrule: Record<string, string> | null; exdates: string[]; recurrenceId: string | null
  cancelled: boolean; free: boolean
}

/** RFC 5545 §3.1: a line that starts with a space or tab continues the one before. */
export function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n')
}

function parseProp(line: string): Prop | null {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/)
  if (colon < 0) return null
  const [name, ...params] = line.slice(0, colon).split(';')
  const p: Record<string, string> = {}
  for (const kv of params) { const i = kv.indexOf('='); if (i > 0) p[kv.slice(0, i).toUpperCase()] = kv.slice(i + 1).replace(/^"|"$/g, '') }
  return { name: name.toUpperCase(), params: p, value: line.slice(colon + 1) }
}

function parseStamp(value: string, params: Record<string, string>): Stamp | null {
  const all = /^(\d{4})(\d{2})(\d{2})$/.exec(value.trim())
  if (all) return { y: +all[1], m: +all[2], d: +all[3], h: 0, mi: 0, zone: 'floating', allDay: true }
  const t = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/.exec(value.trim())
  if (!t) return null
  const zone = t[7] ? 'utc' : params.TZID ? params.TZID : 'floating'
  return { y: +t[1], m: +t[2], d: +t[3], h: +t[4], mi: +t[5], zone, allDay: false }
}

function parseDuration(value: string): number | null {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim())
  if (!m) return null
  const min = (+(m[2] ?? 0)) * 7 * 1440 + (+(m[3] ?? 0)) * 1440 + (+(m[4] ?? 0)) * 60 + (+(m[5] ?? 0))
  return m[1] === '-' ? -min : min
}

/** Wall-clock parts of an instant in a zone. */
function partsIn(ms: number, zone: string) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  const get = (t: string) => +(f.formatToParts(new Date(ms)).find(p => p.type === t)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute') }
}

function validZone(zone: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return true } catch { return false }
}

/** The instant a wall-clock time names in `zone`. Two passes settle the offset, DST included. */
function instantOf(s: Pick<Stamp, 'y' | 'm' | 'd' | 'h' | 'mi'>, zone: string): number {
  const guess = Date.UTC(s.y, s.m - 1, s.d, s.h, s.mi)
  let ms = guess
  for (let i = 0; i < 2; i++) {
    const p = partsIn(ms, zone)
    ms += guess - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi)
  }
  return ms
}

/** A stamp as an instant. Floating times and unknown zones are read as campus time. */
function toInstant(s: Stamp): number {
  if (s.zone === 'utc') return Date.UTC(s.y, s.m - 1, s.d, s.h, s.mi)
  const zone = s.zone !== 'floating' && validZone(s.zone) ? s.zone : CAMPUS_TIME_ZONE
  return instantOf(s, zone)
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const keyOf = (s: Stamp) => `${ymd(s.y, s.m, s.d)}T${pad(s.h)}${pad(s.mi)}`

function addDays(s: Stamp, n: number): Stamp {
  const d = new Date(Date.UTC(s.y, s.m - 1, s.d + n))
  return { ...s, y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}
const weekday = (s: Stamp) => new Date(Date.UTC(s.y, s.m - 1, s.d)).getUTCDay()
const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const dayNumber = (s: Stamp) => Math.floor(Date.UTC(s.y, s.m - 1, s.d) / 86_400_000)

function readEvents(text: string): Vevent[] {
  const out: Vevent[] = []
  let cur: Partial<Vevent> & { props?: Prop[] } | null = null
  let depth = 0
  for (const line of unfold(text)) {
    const up = line.toUpperCase()
    if (up === 'BEGIN:VEVENT') { cur = { props: [] }; depth = 0; continue }
    if (!cur) continue
    if (up.startsWith('BEGIN:')) { depth++; continue }   // VALARM and friends
    if (up.startsWith('END:') && up !== 'END:VEVENT') { depth = Math.max(0, depth - 1); continue }
    if (up === 'END:VEVENT') {
      const props = cur.props ?? []
      const get = (n: string) => props.find(p => p.name === n)
      const ds = get('DTSTART'), start = ds ? parseStamp(ds.value, ds.params) : null
      if (start) {
        const de = get('DTEND'), dur = get('DURATION')
        const rr = get('RRULE')
        const rrule = rr ? Object.fromEntries(rr.value.split(';').map(kv => kv.split('=')).filter(kv => kv.length === 2).map(([k, v]) => [k.toUpperCase(), v.toUpperCase()])) : null
        const exdates = props.filter(p => p.name === 'EXDATE').flatMap(p => p.value.split(',').map(v => parseStamp(v, p.params)).filter((s): s is Stamp => !!s).map(keyOf))
        const rid = get('RECURRENCE-ID'), ridStamp = rid ? parseStamp(rid.value, rid.params) : null
        out.push({
          uid: get('UID')?.value ?? '', summary: (get('SUMMARY')?.value ?? '').replace(/\\([,;\\nN])/g, (_, c) => /n/i.test(c) ? ' ' : c),
          start, end: de ? parseStamp(de.value, de.params) : null, duration: dur ? parseDuration(dur.value) : null,
          rrule, exdates, recurrenceId: ridStamp ? keyOf(ridStamp) : null,
          cancelled: (get('STATUS')?.value ?? '').toUpperCase() === 'CANCELLED',
          free: (get('TRANSP')?.value ?? '').toUpperCase() === 'TRANSPARENT',
        })
      }
      cur = null; continue
    }
    if (depth > 0) continue
    const p = parseProp(line)
    if (p) cur.props!.push(p)
  }
  return out
}

/** Every start of a repeating event, in its own wall time, until the range ends. */
function occurrences(ev: Vevent, lastDay: number): Stamp[] {
  if (!ev.rrule) return [ev.start]
  const r = ev.rrule
  const freq = r.FREQ
  if (freq !== 'DAILY' && freq !== 'WEEKLY') return [ev.start]   // monthly and yearly repeats: first one only
  const interval = Math.max(1, Number(r.INTERVAL) || 1)
  const count = r.COUNT ? Math.max(0, Number(r.COUNT) || 0) : Infinity
  const until = r.UNTIL ? parseStamp(r.UNTIL, {}) : null
  const untilMs = until ? (until.allDay ? toInstant({ ...addDays(until, 1), zone: until.zone }) - 1 : toInstant(until)) : Infinity
  const byday = (r.BYDAY ?? '').split(',').map(s => s.replace(/^[+-]?\d+/, '')).filter(d => DAYS.includes(d))
  const days = freq === 'WEEKLY' ? (byday.length ? byday : [DAYS[weekday(ev.start)]]) : null
  const startDay = dayNumber(ev.start)
  // Weeks are counted from the week (Monday start, RFC 5545 default WKST=MO) that holds DTSTART.
  const weekStart = startDay - ((weekday(ev.start) + 6) % 7)
  const out: Stamp[] = []
  let made = 0
  for (let i = 0, s = ev.start; i < MAX_STEPS; i++, s = addDays(ev.start, i)) {
    const n = dayNumber(s)
    if (n > lastDay || made >= count) break
    const ok = freq === 'DAILY'
      ? (n - startDay) % interval === 0
      : days!.includes(DAYS[weekday(s)]) && Math.floor((n - weekStart) / 7) % interval === 0
    if (!ok) continue
    if (toInstant(s) > untilMs) break
    made++
    out.push(s)
  }
  return out
}

/** The campus-time stretches an occurrence covers, one per day it touches. */
function toProposals(ev: Vevent, s: Stamp, range: BusyRange): BusyProposal[] {
  const label = ev.summary.trim() || 'Calendar event'
  if (s.allDay) {
    const span = ev.end?.allDay ? Math.max(0, dayNumber(ev.end) - dayNumber(ev.start) - 1) : 0
    const endDay = addDays(s, span)
    const out: BusyProposal[] = []
    for (let d = s, i = 0; dayNumber(d) <= dayNumber(endDay) && i < 14; d = addDays(d, 1), i++) {
      const date = ymd(d.y, d.m, d.d)
      if (date >= range.from && date <= range.to) out.push({ date, start: '08:00', end: '23:00', label: `${label} (all day)`, source: 'ics', suggested: false })
    }
    return out
  }
  const a = toInstant(s)
  // A repeat keeps the first occurrence's length; its start follows its own wall clock, so DST is right.
  const length = ev.end && !ev.end.allDay ? toInstant(ev.end) - toInstant(ev.start) : (ev.duration ?? 60) * 60_000
  const b = a + Math.max(0, length)
  if (b <= a) return []
  const out: BusyProposal[] = []
  for (let t = a, i = 0; t < b && i < 14; i++) {
    const p = partsIn(t, CAMPUS_TIME_ZONE)
    const date = ymd(p.y, p.m, p.d)
    const midnight = instantOf({ ...p, h: 0, mi: 0, d: p.d + 1 }, CAMPUS_TIME_ZONE)
    const stop = Math.min(b, midnight)
    const q = partsIn(stop, CAMPUS_TIME_ZONE)
    const end = stop === midnight ? '23:59' : `${pad(q.h)}:${pad(q.mi)}`
    if (date >= range.from && date <= range.to) out.push({ date, start: `${pad(p.h)}:${pad(p.mi)}`, end, label, source: 'ics', suggested: true })
    t = stop
  }
  return out
}

export function readIcs(text: string, range: BusyRange): BusyImport {
  if (text.length > MAX_ICS_BYTES) return { proposals: [], unclear: ['That file is too big. Export just this term or this month.'] }
  if (!/BEGIN:VCALENDAR/i.test(text)) return { proposals: [], unclear: ['That file is not a calendar (.ics) file.'] }
  const events = readEvents(text)
  const lastDay = Math.floor(Date.parse(range.to + 'T00:00:00Z') / 86_400_000)
  // A moved or cancelled single occurrence replaces the one its RECURRENCE-ID names.
  const replaced = new Map<string, Set<string>>()
  for (const ev of events) if (ev.recurrenceId) {
    const set = replaced.get(ev.uid) ?? new Set<string>(); set.add(ev.recurrenceId); replaced.set(ev.uid, set)
  }
  const out: BusyProposal[] = []
  let skippedRepeats = 0
  for (const ev of events) {
    if (ev.cancelled || ev.free) continue
    if (ev.rrule && ev.rrule.FREQ !== 'DAILY' && ev.rrule.FREQ !== 'WEEKLY') skippedRepeats++
    const skip = new Set([...ev.exdates, ...(ev.recurrenceId ? [] : replaced.get(ev.uid) ?? [])])
    for (const s of occurrences(ev, lastDay)) {
      if (skip.has(keyOf(s))) continue
      const moved = { ...s, h: s.allDay ? 0 : s.h, mi: s.allDay ? 0 : s.mi }
      out.push(...toProposals(ev, moved, range))
    }
  }
  const unclear = skippedRepeats ? [`${skippedRepeats} event${skippedRepeats === 1 ? ' repeats' : 's repeat'} monthly or yearly. Only the first time was read.`] : []
  return { proposals: checkProposals(out, range), unclear }
}

export const icsSource: BusySource<string> = { kind: 'ics', read: readIcs }
