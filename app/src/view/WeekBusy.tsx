// VIEW: the week of busy and free time (Nov 27, Cyn: the prototype she picked, in P2).
// The day leaves head seven columns. The open day is wide and editable: drag on empty time to add busy
// time, drag a window to move it, drag its top or bottom edge to stretch it. Other days open with a tap.
// Busy time you add is stone, busy time from Google Calendar is Google blue, My Schedule plans are paper with a
// maroon rim. A tap on a plan brings it to the front with its full title (Nov 27, Cyn: overlapping plans need
// to be readable); plans are walls, so they never move.
// The grid is pointer-only and hidden from screen readers; the typed times and lists beside it do the
// same jobs by keyboard. The controller owns the five-minute steps; this view only reports cells.
import { useRef, useState } from 'react'
import { CELL, CELLS, DAY_START, NIGHT_CELLS, TAP_CELLS, span, type MarkModel, type MarkRun, type WeekDay } from '../controller/freeMarks'
import { usePhoneViewport } from './useMobileDetailFocus'
import './week.css'

type Reshape = (from: { first: number; last: number } | null, first: number, last: number) => void
type Drag = { kind: 'new' | 'move' | 'start' | 'end'; from: MarkRun | null; anchor: number; grab: number; first: number; last: number; lo: number; hi: number; moved: boolean }

const EDGE_PX = 9
// The rows on screen. The day is all 24 hours, and the night before 7am is folded away until it is asked for
// or something sits in it, so a phone still shows a whole waking day without scrolling. One week is drawn at a
// time, so the fold is kept here and set as the week renders.
const view = { first: NIGHT_CELLS }
const rows = () => CELLS - view.first
const shownHours = () => (rows() * CELL) / 60
const pct = (i: number) => ((i - view.first) / rows()) * 100
const hourLabel = (h: number) => (h % 24 === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`)
const duration = (cells: number) => {
  const m = cells * CELL, h = Math.floor(m / 60), r = m % 60
  return `${h ? `${h} hr` : ''}${h && r ? ' ' : ''}${r ? `${r} min` : ''}`
}

export function WeekBusy({ model, onDate, onReshape, freeMode }: {
  model: MarkModel
  onDate: (date: string) => void
  onReshape: Reshape
  freeMode: boolean
}) {
  const phone = usePhoneViewport()
  const open = model.week.findIndex(d => d.selected)
  // Anything before 7am (a plan, busy time, a Google event) opens the night by itself.
  const [night, setNight] = useState(false)
  const early = model.week.some(d => [...d.mine, ...d.google, ...d.plans].some(r => r.first < NIGHT_CELLS))
  view.first = night || early ? 0 : NIGHT_CELLS
  // On a phone every closed day keeps a 50px leaf (44px or more on screen under the phone zoom, an easy tap)
  // and the open day takes the rest. The hours move inside the open day there, so it keeps its width.
  const columns = phone
    ? model.week.map((_, i) => (i === open ? 'minmax(0, 1fr)' : '50px')).join(' ')
    : `34px repeat(${model.week.length}, minmax(0, 1fr))`
  return (
    <div className={'sq-week' + (freeMode ? ' sq-week-freemode' : '') + (phone ? ' sq-week-phone' : '')} style={{ '--sq-week-cols': columns, '--sq-week-hours': shownHours() } as React.CSSProperties}>
      <div className="sq-days sq-week-leaves" role="group" aria-label="Day">
        {model.days.map(d => (
          <button key={d.date} type="button" className="sq-dayleaf" aria-pressed={d.selected} data-today={d.today || undefined}
            onClick={() => onDate(d.date)}>
            <span className="sq-dayleaf-dow">{d.dow}</span>
            <span className="sq-dayleaf-num">{d.day}</span>
            <span className="sq-visually-hidden">{d.month}{d.marked ? (freeMode ? ', has free time' : ', has busy time') : ''}</span>
            {d.marked > 0 && <i className="sq-dayleaf-dab" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <div className="sq-week-grid" aria-hidden="true">
        {!phone && <Hours />}
        {model.week.map(day => day.selected
          ? <OpenDay key={day.date} day={day} model={model} onReshape={onReshape} freeMode={freeMode} wide hours={phone} />
          : <ClosedDay key={day.date} day={day} onOpen={() => onDate(day.date)} freeMode={freeMode} labels={!phone} />)}
      </div>
      {!early && <button type="button" className="sq-text-button sq-week-nightbtn" aria-pressed={night} onClick={() => setNight(on => !on)}>
        {night ? 'Hide 12am to 7am' : 'Show 12am to 7am'}
      </button>}
    </div>
  )
}

function Hours() {
  const firstHour = (DAY_START + view.first * CELL) / 60, hours = shownHours()
  return (
    <div className="sq-week-hours">
      {Array.from({ length: 13 }, (_, k) => 2 * k).filter(h => h > firstHour && h < firstHour + hours)
        .map(h => <span key={h} style={{ top: ((h - firstHour) / hours) * 100 + '%' }}>{hourLabel(h)}</span>)}
    </div>
  )
}

function Lines() {
  const hours = shownHours()
  return <>{Array.from({ length: hours - 1 }, (_, k) => <i key={k} className="sq-wk-line" style={{ top: ((k + 1) / hours) * 100 + '%' }} />)}</>
}
const at = (first: number, last: number): React.CSSProperties => ({ top: pct(first) + '%', height: `calc(${pct(last + 1) - pct(first)}% - 2px)` })

// Plans that overlap step in from the left, like a calendar: each later one sits on top, a little to the right,
// so every plan's title row stays readable.
function lanes(plans: WeekDay['plans']) {
  const sorted = [...plans].sort((a, b) => a.first - b.first || b.last - a.last)
  const out: { plan: WeekDay['plans'][number]; lane: number; of: number }[] = []
  let cluster: typeof out = [], ends: number[] = [], reach = -1
  const close = () => { cluster.forEach(c => { c.of = ends.length }); cluster = []; ends = [] }
  for (const plan of sorted) {
    if (plan.first > reach) close()
    let lane = ends.findIndex(e => e < plan.first)
    if (lane < 0) { lane = ends.length; ends.push(plan.last) } else ends[lane] = plan.last
    const item = { plan, lane, of: 1 }
    cluster.push(item); out.push(item)
    reach = Math.max(reach, plan.last)
  }
  close()
  return out
}

function Blocks({ day, hidden, freeMode, labels, front = null }: { day: WeekDay; hidden: number; freeMode: boolean; labels: boolean; front?: string | null }) {
  return <>
    {view.first === 0 && <i className="sq-wk-night" style={{ height: pct(NIGHT_CELLS) + '%' }} />}
    {day.past > view.first && <i className="sq-wk-past" style={{ height: pct(day.past) + '%' }} />}
    {lanes(day.plans).map(({ plan: p, lane, of }) => (
      <span key={p.id} data-plan={p.id} className={'sq-wk-plan' + (front === p.id ? ' sq-wk-front' : '')}
        style={{ ...at(p.first, p.last), left: front === p.id ? 'calc(var(--wk-inset, 0px) + 1px)' : `calc(var(--wk-inset, 0px) + ${Math.min(lane, 3) * (of > 2 ? 18 : 26)}% + 1px)`, zIndex: front === p.id ? 6 : 1 + lane }}>
        {front === p.id ? <><b>{p.title}</b><small>{p.label}</small></> : labels && p.last - p.first >= 5 && <b>{p.title}</b>}
      </span>
    ))}
    {day.mine.filter(r => r.first !== hidden).map(r => (
      <span key={'m' + r.first} className={'sq-wk-busy' + (freeMode ? ' sq-wk-busy-free' : '')} style={at(r.first, r.last)}>
        {labels && r.last - r.first >= 7 && <small>{r.label}</small>}
      </span>
    ))}
    {day.google.filter(r => { const m = day.mine.find(x => x.first === hidden); return !m || r.last < m.first || r.first > m.last }).map(r => (
      <span key={'g' + r.first} className="sq-wk-google" style={at(r.first, r.last)}>
        {labels && r.last - r.first >= 7 && <small>{r.label}</small>}
      </span>
    ))}
    {labels && !freeMode && day.free.filter(r => r.last - r.first + 1 >= 12).map(r => (
      <span key={'f' + r.first} className="sq-wk-freelabel" style={{ top: `calc(${pct(r.first)}% + 6px)` }}>{duration(r.last - r.first + 1)} free</span>
    ))}
  </>
}

function ClosedDay({ day, onOpen, freeMode, labels }: { day: WeekDay; onOpen: () => void; freeMode: boolean; labels: boolean }) {
  return (
    <div className="sq-wk-col" onClick={onOpen}>
      <Lines />
      <Blocks day={day} hidden={-1} freeMode={freeMode} labels={labels} />
    </div>
  )
}

function OpenDay({ day, model, onReshape, freeMode, wide, hours = false }: { day: WeekDay; model: MarkModel; onReshape: Reshape; freeMode: boolean; wide: boolean; hours?: boolean }) {
  const col = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [front, setFront] = useState<string | null>(null)
  const cellAt = (y: number) => { const r = col.current!.getBoundingClientRect(); return Math.max(view.first, Math.min(CELLS - 1, view.first + Math.floor(((y - r.top) / r.height) * rows()))) }
  const yOf = (i: number) => { const r = col.current!.getBoundingClientRect(); return r.top + ((i - view.first) / rows()) * r.height }

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const c = cellAt(e.clientY), state = model.cells[c]?.state
    const run = model.mine.find(r => c >= r.first && c <= r.last)
    // A tap on a plan brings it to the front (a second tap, or a tap elsewhere, puts it back).
    const plan = (e.target as HTMLElement).closest<HTMLElement>('[data-plan]')?.dataset.plan
    if (plan) { setFront(f => (f === plan ? null : plan)); return }
    setFront(null)
    // My Schedule plans and the past are walls: busy time stops at them and never slides under.
    const free = (i: number) => i >= 0 && i < CELLS && model.cells[i].state !== 'busy' && model.cells[i].state !== 'past'
    let lo = c, hi = c
    while (free(lo - 1)) lo--
    while (free(hi + 1)) hi++
    let d: Drag | null = null
    if (run) {
      const top = yOf(run.first), bottom = yOf(run.last + 1)
      const kind = e.clientY - top < EDGE_PX ? 'start' : bottom - e.clientY < EDGE_PX ? 'end' : 'move'
      d = { kind, from: run, anchor: c, grab: c - run.first, first: run.first, last: run.last, lo, hi, moved: false }
    } else if (state === 'busy') return
    else if (state === 'past') return
    else d = { kind: 'new', from: null, anchor: c, grab: 0, first: c, last: c, lo, hi, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(d)
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const c = Math.max(drag.lo, Math.min(drag.hi, cellAt(e.clientY)))
    let { first, last } = drag
    if (drag.kind === 'new') { first = Math.min(drag.anchor, c); last = Math.max(drag.anchor, c) }
    else if (drag.kind === 'move' && drag.from) { const len = drag.from.last - drag.from.first; first = Math.max(drag.lo, Math.min(drag.hi - len, c - drag.grab)); last = first + len }
    else if (drag.kind === 'start' && drag.from) { first = Math.min(c, drag.from.last); last = drag.from.last }
    else if (drag.kind === 'end' && drag.from) { first = drag.from.first; last = Math.max(c, drag.from.first) }
    if (first !== drag.first || last !== drag.last || c !== drag.anchor) setDrag({ ...drag, first, last, moved: drag.moved || c !== drag.anchor })
  }
  const up = () => {
    if (!drag) return
    const d = drag; setDrag(null)
    if (d.kind === 'new') onReshape(null, d.first, d.moved ? d.last : Math.min(d.hi, d.first + TAP_CELLS - 1))
    else if (d.moved && d.from) onReshape({ first: d.from.first, last: d.from.last }, d.first, d.last)
  }
  const hidden = drag?.from ? drag.from.first : -1
  return (
    <div ref={col} className={'sq-wk-col sq-wk-open' + (drag ? ' sq-wk-dragging sq-wk-' + drag.kind : '')}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      <Lines />
      {hours && <Hours />}
      <Blocks day={day} hidden={hidden} freeMode={freeMode} labels={wide} front={front} />
      {drag && <span className={'sq-wk-busy sq-wk-ghost' + (freeMode ? ' sq-wk-busy-free' : '')} style={at(drag.first, drag.last)}>
        <small>{span(DAY_START + drag.first * CELL, DAY_START + (drag.last + 1) * CELL)}</small>
      </span>}
    </div>
  )
}
