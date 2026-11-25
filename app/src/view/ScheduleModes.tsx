// VIEW: one day of My Schedule drawn two ways. "Trail" folds each plan into a thin
// line with its name beside it; "Tickets" grows each line into its ticket. Both
// read the Controller's day timeline (start, end, lane), so nothing is re-timed here.
import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { PlanStubModel } from '../controller/presentSchedule'
import type { DayTimeline, TimelineEntry } from '../controller/scheduleTimeline'
import { categoryOfPlan, type EventCategory } from '../controller/eventCategory'
import { CATEGORY_COLORS } from './categoryColors'
import { useQuiet } from './quietContext'
import './schedule-modes.css'

export type ScheduleMode = 'trail' | 'tickets' | 'wisteria'

const PALETTE: Record<EventCategory, [string, string, string]> = CATEGORY_COLORS
export const CATEGORY_KEY: { id: EventCategory; label: string }[] = [
  { id: 'arts', label: 'Arts' }, { id: 'learning', label: 'Learning' }, { id: 'social', label: 'Food' },
  { id: 'sports', label: 'Sports' }, { id: 'service', label: 'Service' }, { id: 'wellness', label: 'Wellness' }, { id: 'other', label: 'Other' },
]
export const colorsFor = (stub: Pick<PlanStubModel, 'title' | 'host'>) =>
  PALETTE[categoryOfPlan(stub)]

type Item = TimelineEntry & { stub: PlanStubModel }
type Group = { start: number; end: number; lanes: number; items: Item[] }

function groupsOf(items: Item[]): Group[] {
  const out: Group[] = []
  for (const it of [...items].sort((a, b) => a.startMinute - b.startMinute)) {
    const g = out[out.length - 1]
    if (g && it.startMinute < g.end) { g.items.push(it); g.end = Math.max(g.end, it.endMinute); g.lanes = Math.max(g.lanes, it.laneCount) }
    else out.push({ start: it.startMinute, end: it.endMinute, lanes: it.laneCount, items: [it] })
  }
  return out
}

const clock = (m: number) => { const h = Math.floor(m / 60), mm = m % 60, h12 = h % 12 || 12; return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}` }
const span = (a: number, b: number) => { const s = clock(a), e = clock(b); return s.slice(-2) === e.slice(-2) ? `${s.slice(0, -2)}–${e}` : `${s}–${e}` }
const hrs = (m: number) => { const h = Math.round(m / 30) / 2; return `${h} hr` }

// Text is measured before it is placed (Nov 24, polish pass): a long name steps down a size or wraps
// onto another line, and the layout makes room, instead of being cut short with "…".
const measureCtx = typeof document !== 'undefined' && typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent)
  ? document.createElement('canvas').getContext('2d') : null
function textWidth(text: string, font: string) {
  if (!measureCtx) return text.length * 0.5 * parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? '16')
  measureCtx.font = font
  return measureCtx.measureText(text).width
}
/** Lines needed to set `text` in `width`, greedy by word; the first line starts `lead` px in. */
function linesFor(text: string, font: string, width: number, lead = 0) {
  const words = text.split(/\s+/).filter(Boolean), space = textWidth(' ', font)
  let lines = 1, x = lead
  for (const w of words) {
    const ww = textWidth(w, font)
    if (x > lead || (lines > 1 && x > 0)) { if (x + space + ww > width) { lines++; x = ww } else x += space + ww }
    else x += ww
  }
  return lines
}
type Fit = { size: number; lines: number }
/** The largest size from `sizes` that sets `text` on one line in `width`; else the smallest size, wrapped. */
function fitText(text: string, family: string, weight: number, sizes: number[], width: number): Fit {
  for (const size of sizes) if (textWidth(text, `${weight} ${size}px ${family}`) <= width) return { size, lines: 1 }
  const size = sizes[sizes.length - 1]
  return { size, lines: linesFor(text, `${weight} ${size}px ${family}`, width) }
}
/** The page's two font families, read once fonts have loaded so measurements match what is drawn. */
function useFamilies(ref: React.RefObject<HTMLElement | null>) {
  const [fam, setFam] = useState({ display: 'Georgia, serif', sans: 'Arial, sans-serif', ready: 0 })
  useLayoutEffect(() => {
    const read = () => { const el = ref.current; if (!el) return; const cs = getComputedStyle(el)
      setFam(f => ({ display: cs.getPropertyValue('--font-display').trim() || f.display, sans: cs.getPropertyValue('--font-sans').trim() || f.sans, ready: f.ready + 1 })) }
    read()
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(read).catch(() => {})
  }, [ref])
  return fam
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => setW(el.clientWidth)
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export function ScheduleDayModes({ events, timeline, mode, now, isToday, onOpen, onOpenTickets, selectedId, compact = false }: {
  events: PlanStubModel[]
  timeline: DayTimeline
  mode: ScheduleMode
  now?: Date
  isToday: boolean
  onOpen: (id: string) => void
  onOpenTickets: () => void
  selectedId: string | null
  compact?: boolean
}) {
  const reviewLayout = useQuiet()
  const [ref, measured] = useWidth<HTMLDivElement>()
  const fam = useFamilies(ref)
  const W = Math.max(measured || 300, 200)
  const byId = new Map(events.map(e => [e.id, e]))
  const items: Item[] = timeline.items.flatMap(t => { const stub = byId.get(t.id); return stub ? [{ ...t, stub }] : [] })
  const groups = groupsOf(items)
  const K = mode === 'tickets'
  const hour = K ? 56 : compact ? 30 : 34
  const FOLD = K ? 52 : 44

  // Long empty stretches fold into one wavy line so the day stays on one screen.
  const folds: { from: number; to: number; free: number; pad: number }[] = []
  for (let i = 1; i < groups.length; i++) {
    const gap = groups[i].start - groups[i - 1].end
    const from = Math.ceil(groups[i - 1].end / 60) * 60, to = Math.floor(groups[i].start / 60) * 60
    // Any gap of two hours or more folds, the same rule on every day (Nov 24).
    if (gap >= 120 && to - from >= 60) folds.push({ from, to, free: gap, pad: 0 })
  }
  const first = timeline.firstMinute, last = timeline.lastMinute
  const Y = (m: number) => {
    let y = 12, cur = first
    for (const f of folds) {
      if (m <= f.from) break
      y += (Math.min(m, f.from) - cur) * hour / 60
      if (m < f.to) return y + (FOLD + f.pad) * (m - f.from) / (f.to - f.from)
      y += FOLD + f.pad; cur = f.to
    }
    return y + (Math.max(m, cur) - cur) * hour / 60
  }
  // Trail labels stack downwards when plans start close together. If a stack would
  // run into a free-time note, the folded gap grows to make room, so every label
  // stays beside its own plan and nothing touches the note.
  const GUT = 46, TX = GUT + 10, X = K ? 64 : TX, R = W - 4
  const lane = (l: number) => TX + l * 12
  const LX = lane(Math.max(1, ...items.map(i => i.laneCount))) + 4
  // A Trail label is "time  name". When it does not fit beside the trail it wraps under itself
  // (the time stays whole), and the labels below move down to make room.
  const LW = Math.max(R - LX - 6, 90)
  const labelLines = new Map<string, number>()
  for (const it of items) {
    const lead = textWidth(span(it.startMinute, it.endMinute), `700 12px ${fam.sans}`) + textWidth(' ', `400 17px ${fam.display}`)
    labelLines.set(it.id, Math.min(linesFor(it.stub.title, `400 17px ${fam.display}`, LW, lead), 3))
  }
  const labelH = (id: string) => 22 * (labelLines.get(id) ?? 1)
  const labelAt = new Map<string, number>()
  const placeLabels = () => {
    let below = -99
    labelAt.clear()
    for (const it of timeline.items) { const y = Math.max(Y(it.startMinute) - 11, below); below = y + labelH(it.id); labelAt.set(it.id, y) }
  }
  placeLabels()
  if (!K) {
    for (const fo of folds) {
      const top = Y(fo.from) + 9
      const bottom = Math.max(-99, ...timeline.items.filter(it => it.startMinute < fo.to).map(it => labelAt.get(it.id)! + labelH(it.id)))
      if (bottom > top - 3) fo.pad = bottom - top + 5
    }
    placeLabels()
  }
  const labelBottom = K ? 0 : Math.max(0, ...items.map(it => (labelAt.get(it.id) ?? 0) + labelH(it.id)))
  let H = Math.max(Y(last) + 16, labelBottom + 6)
  const hours: number[] = []
  for (let m = first; m <= last; m += 60) if (!folds.some(f => m > f.from && m < f.to)) hours.push(m)


  // Ticket geometry: one lane is full width; a long plan holding shorter ones becomes a spine;
  // two lanes sit side by side; three or more fold into a stack you can read in one glance.
  type Box = { l: number; t: number; w: number; h: number; kind: 'ticket' | 'spine' | 'stack' | 'behind'; depth?: number }
  const boxes = new Map<string, Box>()
  const stacks: Group[] = []
  for (const g of groups) {
    const full = R - X
    if (g.lanes === 1) { for (const it of g.items) boxes.set(it.id, { l: X, t: Y(it.startMinute) + 1, w: full, h: Math.max(Y(it.endMinute) - Y(it.startMinute) - 3, 32), kind: 'ticket' }); continue }
    const outer = g.items.find(it => it.startMinute === g.start && it.endMinute === g.end && it.endMinute - it.startMinute >= 150)
    if (g.lanes === 2 && outer) {
      boxes.set(outer.id, { l: X, t: Y(outer.startMinute) + 1, w: 30, h: Y(outer.endMinute) - Y(outer.startMinute) - 3, kind: 'spine' })
      for (const it of g.items) if (it !== outer) boxes.set(it.id, { l: X + 36, t: Y(it.startMinute) + 1, w: full - 36, h: Math.max(Y(it.endMinute) - Y(it.startMinute) - 3, 32), kind: 'ticket' })
    } else if (g.lanes === 2) {
      const half = (full - 6) / 2
      for (const it of g.items) boxes.set(it.id, { l: X + it.lane * (half + 6), t: Y(it.startMinute) + 1, w: half, h: Math.max(Y(it.endMinute) - Y(it.startMinute) - 3, 32), kind: 'ticket' })
    } else {
      stacks.push(g)
      const t = Y(g.start) + 1, h = Math.max(Y(g.end) - Y(g.start) - 3, 30 + g.items.length * 21)
      g.items.forEach((it, i) => boxes.set(it.id, { l: X + Math.min(i, 2) * 5, t: t + Math.min(i, 2) * 5, w: full - 10, h, kind: i === 0 ? 'stack' : 'behind', depth: i }))
    }
  }

  // Ticket text is fitted to its ticket: the name steps down from 19px to 15px to stay on one line;
  // a name that still does not fit wraps, and its ticket grows to hold it. A place that does not fit
  // on its line is left off the ticket (it is on the opened card), never cut short.
  type TicketFit = { title: Fit; showPlace: boolean; place: Fit; rows: Fit[]; small: boolean; time?: { text: string; size: number } }
  const fits = new Map<string, TicketFit>()
  const emW = (it: Item) => textWidth(span(it.startMinute, it.endMinute), `700 12px ${fam.sans}`)
  for (const it of items) {
    const b = boxes.get(it.id); if (!b) continue
    const cw = b.w - 15 - 10 - 3
    if (b.kind === 'ticket') {
      const small = b.h < 44
      // The time is one unit: it steps down to fit, and a ticket too narrow even then shows the start time only
      // (its height already shows how long the plan runs).
      const whole = span(it.startMinute, it.endMinute)
      const timeSize = [12, 11, 10.5].find(z => textWidth(whole, `700 ${z}px ${fam.sans}`) <= (small ? cw * .5 : cw)) ?? 0
      const time = timeSize ? { text: whole, size: timeSize } : { text: clock(it.startMinute), size: 11 }
      const title = small
        ? fitText(it.stub.title, fam.display, 400, [17, 16, 15, 14, 13], cw - emW(it) - 8)
        : fitText(it.stub.title, fam.display, 400, [19, 18, 17, 16, 15], cw)
      const titleH = title.lines * title.size * 1.1
      const place = fitText(it.stub.location || '', fam.sans, 600, [12, 11.5, 11], cw - 12)
      const roomForPlace = !small && b.h - (7 + 16 + titleH + 3) >= 17
      const need = small ? 6 + titleH + 7 : 7 + 16 + titleH + 9
      // The standard timeline keeps the ticket height tied to event minutes.
      // The full title is available on the button and in the opened details.
      if (reviewLayout && need > b.h) b.h = Math.ceil(need)
      const ticketTitle = reviewLayout ? title : { ...title, lines: 1 }
      fits.set(it.id, { title: ticketTitle, showPlace: roomForPlace && place.lines === 1 && !!it.stub.location, place, rows: [], small, time })
    } else if (b.kind === 'stack') {
      const g = stacks.find(st => st.items[0].id === it.id)
      if (!g) continue
      const rows = g.items.map(m => fitText(m.stub.title, fam.sans, 500, [13.5, 13, 12.5, 12], cw - 9 - 7 - emW(m) - 7))
      const extra = rows.reduce((t, r) => t + (r.lines - 1) * 16, 0)
      for (const m of g.items) { const bm = boxes.get(m.id); if (bm) bm.h += extra }
      fits.set(it.id, { title: { size: 21, lines: 1 }, showPlace: false, place: { size: 12, lines: 1 }, rows, small: false })
    }
  }
  if (K) H = Math.max(H, ...[...boxes.values()].map(b => b.t + b.h + 8))

  const nowMin = now && isToday ? now.getHours() * 60 + now.getMinutes() : null
  const showNow = nowMin !== null && nowMin >= first && nowMin <= last
  // The time column holds three kinds of text: the NOW pill, "clash!" notes and
  // hour labels. They are placed in that order of importance and none may touch
  // another: a clash note slides along its own overlap until it fits, and an
  // hour label that would touch anything is left out.
  const column: { y: number; h: number }[] = []
  const taken = (y: number, h: number) => column.some(c => y < c.y + c.h + 3 && y + h + 3 > c.y)
  if (showNow) column.push({ y: Y(nowMin!) - 9, h: 18 })
  const clashAt = new Map<number, number>()
  for (const g of groups.filter(g => g.lanes > 1)) {
    const want = Y(g.start + Math.min(30, (g.end - g.start) / 2)) - 12, lo = Y(g.start) - 8, hi = Math.max(lo, Y(g.end) - 26)
    let y = want
    for (let d = 0; d <= hi - lo + 60; d += 2) {
      if (want + d <= hi + 30 && !taken(want + d, 24)) { y = want + d; break }
      if (want - d >= lo - 30 && !taken(want - d, 24)) { y = want - d; break }
    }
    clashAt.set(g.start, y)
    if (K) column.push({ y, h: 24 })
  }
  const hourLabels = hours.filter(m => {
    const y = Y(m) - 9
    if (taken(y, 18)) return false
    column.push({ y, h: 18 })
    return true
  })

  return (
    <div ref={ref} className={`sqm-day sqm-${mode}`} style={{ height: H }}>
      {hourLabels.map(m => <span key={`h${m}`} className="sqm-hour" style={{ top: Y(m) - 9 }}>{clock(m)}</span>)}
      {hours.map(m => <i key={`g${m}`} className="sqm-grid" style={{ top: Y(m), left: K ? 58 : 40 }} />)}
      {folds.map(f => (
        <div key={`f${f.from}`}>
          <svg className="sqm-break" style={{ top: Y(f.from) + 4, left: (K ? 64 : TX) - 22, height: Y(f.to) - Y(f.from) - 8 }} width="44" viewBox={`0 0 44 ${Y(f.to) - Y(f.from) - 8}`} aria-hidden="true">
            <path d={breakMark(Y(f.to) - Y(f.from) - 8)} /><path className="sqm-break-dots" d={breakDots(Y(f.to) - Y(f.from) - 8)} />
          </svg>
          <div className="sqm-fold" style={{ top: Y(f.from) + (Y(f.to) - Y(f.from)) / 2 - 12, left: (K ? 64 : TX) + 26 }}>
            <a href="#discover">{hrs(f.free)} free →</a>
          </div>
        </div>
      ))}

      {/* overlap, drawn: hatching in Trail, bracket and margin note in Tickets */}
      {groups.filter(g => g.lanes > 1).map(g => (
        <div key={`o${g.start}`}>
          <i className="sqm-hatch" style={{ top: Y(g.start), height: Y(g.end) - Y(g.start), left: TX - 8, width: (g.lanes - 1) * 12 + 16 }} />
          <svg className="sqm-bracket" style={{ top: Y(g.start) + 3, height: Math.max(Y(g.end) - Y(g.start) - 6, 10) }} viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M10 1Q2 1 2 6L2 94Q2 99 10 99" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="sqm-clash" style={{ top: clashAt.get(g.start) }}>clash!</span>
        </div>
      ))}

      {items.map(it => {
        const [col, tint, dark] = colorsFor(it.stub)
        const b = boxes.get(it.id)!
        const sel = selectedId === it.id
        const style = K
          ? { left: b.l, top: b.t, width: b.w, height: b.h, zIndex: b.kind === 'behind' ? 3 - (b.depth ?? 1) : 3, background: tint,
              borderColor: `${col}${it.stub.overlap ? 'aa' : '55'}`, borderStyle: it.stub.overlap && b.kind === 'ticket' ? 'dashed' : 'solid',
              boxShadow: (b.kind === 'spine' ? `inset 0 6px 0 ${col}` : `inset 5px 0 0 ${col}`) + (sel ? `, 0 0 0 2.5px ${col}` : ''), borderRadius: 11 }
          : { left: lane(it.lane) - 2.5, top: Y(it.startMinute), width: 5, height: Math.max(Y(it.endMinute) - Y(it.startMinute), 5), zIndex: 3,
              background: col, borderColor: 'transparent', boxShadow: 'none', borderRadius: 3 }
        const small = fits.get(it.id)?.small ?? b.h < 44
        const tm = span(it.startMinute, it.endMinute)
        const label = labelAt.get(it.id) ?? Y(it.startMinute) - 11
        return (
          <div key={it.id}>
            <button type="button" className={`sqm-plan${it.stub.preview ? ' sqm-preview' : ''}`} data-event-id={it.id} style={style} onClick={() => K ? onOpen(it.id) : onOpenTickets()}
              tabIndex={K ? 0 : -1} aria-hidden={K ? undefined : true}
              aria-label={`${it.stub.title}, ${tm}${it.stub.preview ? ', not planned yet' : ''}${it.stub.overlap ? `, ${it.stub.overlap.text}` : ''}`}>
              <span className="sqm-kc" aria-hidden="true">
                {b.kind === 'stack' ? (() => { const g = stacks.find(s => s.items[0].id === it.id)!
                  return <span className="sqm-stack"><b><i>{g.items.length}</i> plans at {clock(g.start)}</b>
                    {g.items.map((m, i) => { const c = colorsFor(m.stub), r = fits.get(it.id)?.rows[i]; return <span key={m.id} className={`sqm-row${r && r.lines > 1 ? ' sqm-wrap' : ''}`} onClick={e => { e.stopPropagation(); if (K) onOpen(m.id) }}><i style={{ background: c[0] }} /><em style={{ color: c[2] }}>{span(m.startMinute, m.endMinute)}</em><span className="sqm-rowt" style={r ? { fontSize: r.size } : undefined}>{m.stub.title}</span></span> })}
                  </span> })()
                : b.kind === 'spine' ? <span className="sqm-spine" style={{ color: dark }}>{it.stub.title}</span>
                : b.kind === 'behind' ? null
                : (() => { const f = fits.get(it.id); const ts = f ? { fontSize: f.title.size, whiteSpace: f.title.lines > 1 ? 'normal' as const : undefined } : undefined
                  return <span className={`sqm-tk${small ? ' sqm-small' : ''}`}>
                    <em style={{ color: dark, fontSize: f?.time?.size }}>{f?.time?.text ?? tm}</em>{small && <strong style={ts}>{it.stub.title}</strong>}
                    {!small && <strong style={ts}>{it.stub.title}</strong>}
                    {!small && (f ? f.showPlace : b.h > 62) && <small style={{ color: dark, fontSize: f?.place.size }}><i />{it.stub.location}</small>}
                  </span> })()}
              </span>
            </button>
            <i className="sqm-ring" style={{ left: lane(it.lane) - 5, top: Y(it.startMinute) - 5, borderColor: col }} />
            {/* A closed ring marks a known end. A plan with no listed end keeps an open tail. */}
            <i className="sqm-ring sqm-ring-end" style={{ left: lane(it.lane) - 4, top: Y(it.endMinute) - 4, borderColor: col }} />
            <span className={`sqm-label${(labelLines.get(it.id) ?? 1) > 1 ? ' sqm-wrap' : ''}`} style={{ left: LX, top: label, maxWidth: LW }} aria-hidden="true">
              <em style={{ color: dark }}>{tm}</em> {it.stub.title}
            </span>
          </div>
        )
      })}

      {/* Trail is an overview: the whole day is one big tap target that opens it as tickets. */}
      {!K && <button type="button" className="sqm-dayhit" onClick={onOpenTickets}
        aria-label={`${items.length} ${items.length === 1 ? 'plan' : 'plans'}: ${items.map(it => `${it.stub.title} ${span(it.startMinute, it.endMinute)}${it.stub.overlap ? ` (${it.stub.overlap.text})` : ''}`).join(', ')}. Show as tickets`} />}

      {showNow && <>
        <i className="sqm-now" style={{ top: Y(nowMin!), left: K ? 56 : TX - 12, ...(K ? {} : { width: LX - TX + 6 }) }} />
        <span className="sqm-nowp" style={{ top: Y(nowMin!) - 9 }}>NOW</span>
      </>}
    </div>
  )
}

/** X6: a dotted line, one curl tipped to an axis-break slant, a dotted line. */
function breakMark(h: number): string {
  const x = 22, y = h / 2, k = .95, a = -22 * Math.PI / 180
  const P = (px: number, py: number) => { const dx = px * k + 1, dy = py * k; return `${(x + dx * Math.cos(a) - dy * Math.sin(a)).toFixed(1)} ${(y + dx * Math.sin(a) + dy * Math.cos(a)).toFixed(1)}` }
  return `M${P(-16, 7)}C${P(-8, 7)} ${P(-6, -8)} ${P(3, -8)}C${P(11, -8)} ${P(13, 0)} ${P(7, 2)}C${P(3, 3)} ${P(1, -2)} ${P(5, -3)}M${P(8, 5)}C${P(12, 7)} ${P(16, 7)} ${P(19, 7)}`
}
function breakDots(h: number): string { return `M22 1V${(h / 2 - 12).toFixed(1)}M22 ${(h / 2 + 12).toFixed(1)}V${h - 1}` }


export function ModeToggle({ mode, onChange }: { mode: ScheduleMode; onChange: (m: ScheduleMode) => void }) {
  return (
    <div className="sqm-toggle" role="group" aria-label="Schedule view">
      <button type="button" aria-pressed={mode === 'trail'} onClick={() => onChange('trail')}>Trail</button>
      <button type="button" aria-pressed={mode === 'tickets'} onClick={() => onChange('tickets')}>Tickets</button>
    </div>
  )
}

export function CategoryKey({ stubs }: { stubs: PlanStubModel[] }) {
  const used = new Set(stubs.map(s => categoryOfPlan(s)))
  return (
    <ul className="sqm-key" aria-label="Colour key" tabIndex={0}>
      {CATEGORY_KEY.filter(c => used.has(c.id)).map(c => <li key={c.id}><i style={{ background: PALETTE[c.id][0] }} />{c.label}</li>)}
      {stubs.some(s => s.overlap) && <li><i className="sqm-key-hatch" />overlap</li>}
    </ul>
  )
}
