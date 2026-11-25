// VIEW: tell SideQuest when you're busy; it works out the free gaps.
// Busy time can be dragged straight onto the day bar, moved, or stretched by its ends.
// The first drag version (Nov 24 morning) painted cells and could not move anything, and
// My Schedule's blue blocks looked editable. Now a busy block is an object you pick up,
// and a tap on a blue block says where to change it. The typed form stays for keyboards.
// The controller owns the half-hour math; this view reports cells.
import { useEffect, useRef, useState } from 'react'
import { CELL, DAY_START, TAP_CELLS, cellAtX, span, type MarkMode, type MarkModel, type MarkRun, type MarkWindow, type When } from '../controller/freeMarks'
import { TimePick } from './Pickers'
import { GroupFitNote, WhosInButton } from './Social'
import { OpenNowLine } from './OpenNow'
import './gaps.css'
import './marks.css'

export function FreeMarker({ model, fitText, onDate, onAddBusy, onFillGap, onUnbusy, onReshape, onClear, onClearBusy = null, onMode, social = false }: {
  model: MarkModel
  fitText: string | null
  onDate: (date: string) => void
  /** Kept for callers; the time tags that used it are no longer drawn. */
  onWhen?: (key: When) => void
  /** Returns false when the times make no sense. */
  onAddBusy: (start: string, end: string) => boolean
  onFillGap: (w: MarkWindow) => void
  onUnbusy: (run: Pick<MarkRun, 'first' | 'last'>) => void
  onReshape: (from: { first: number; last: number } | null, first: number, last: number) => void
  /** "Show all events": stop filtering by free time. Changes no marks. */
  onClear: (() => void) | null
  /** "Clear busy time": removes every busy mark (the page offers Undo). */
  onClearBusy?: (() => void) | null
  /** The Busy/Free switch. Without it the bar only marks busy time. */
  onMode?: (mode: MarkMode) => void
  social?: boolean
}) {
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [typedError, setTypedError] = useState(false)
  const day = model.days.find(d => d.selected)!
  const dayName = day.today ? 'today' : `${day.dow} ${day.day}`
  const past = model.cells.filter(c => c.state === 'past').length
  const freeMode = model.mode === 'free'
  const markName = freeMode ? 'Free' : 'Busy'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = Boolean(from && until) && onAddBusy(from, until)
    setTypedError(!ok)
    if (ok) { setFrom(''); setUntil('') }
  }

  return (
    <section className="sq-gaps sq-marks" aria-labelledby="sq-discover-title">
      <div className="sq-gaps-head">
        <div>
          <h1 id="sq-discover-title">What fits your free time?</h1>
          <p>Mark when you're busy. Gold is your free time.</p>
          <nav className="sq-look-links" aria-label="Also on Discover"><a className="sq-look-link sq-look-link-map" href="#map">See it on the map</a></nav>
        </div>
      </div>

      <div className="sq-marks-cols">
      <div className="sq-marks-left">
      {/* The day leaves are the only day control. The luggage time tags (This week / Now / This afternoon /
          Tonight) and the date stamp were taken off by owner decision on Nov 25; the controller still knows them. */}
      <div className="sq-days" role="group" aria-label="Day">
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

      <div className="sq-mbar-wrap">
        {onMode && (
          <div className="sq-markmode" role="group" aria-label="What you mark on the bar">
            <button type="button" aria-pressed={!freeMode} onClick={() => onMode('busy')}>Busy</button>
            <button type="button" aria-pressed={freeMode} onClick={() => onMode('free')}>Free</button>
          </div>
        )}
        <div className="sq-mbar-labels" aria-hidden="true">
          {model.free.map(r => <span key={r.first} className="sq-mbar-label" style={{ left: r.left + '%', width: r.width + '%' }}>{r.label}</span>)}
        </div>
        <DayBar model={model} past={past} onReshape={onReshape} />
        <div className="sq-mbar-ticks" aria-hidden="true">
          {model.ticks.map(t => <span key={t.label} style={{ left: t.left + '%' }}>{t.label}</span>)}
        </div>
        <p className="sq-mbar-key"><a href="#schedule" aria-label="My Schedule, change your plans there"><i className="sq-key-busy" aria-hidden="true" />My Schedule</a> {freeMode
          ? <span><i className="sq-key-free" aria-hidden="true" />free, drag to add</span>
          : <><span><i className="sq-key-mine" aria-hidden="true" />busy, drag to add</span> <span><i className="sq-key-free" aria-hidden="true" />free</span></>}</p>
      </div>

      </div>
      <div className="sq-marks-right">
      {/* One compact row: From, Until and a small Add, on phones too. */}
      <form className="sq-busy-form sq-busy-row" onSubmit={submit} aria-label={`Add ${markName.toLowerCase()} time, ${dayName}`}>
        <span className="sq-busy-form-name" aria-hidden="true">{markName}</span>
        <TimePick label={`${markName} from`} placeholder="From" value={from} onChange={v => { setFrom(v); setTypedError(false) }} step={5} firstHour={8} lastHour={22} />
        <span aria-hidden="true">–</span>
        <TimePick label="until" placeholder="Until" value={until} onChange={v => { setUntil(v); setTypedError(false) }} step={5} firstHour={8} lastHour={23} />
        <button type="submit" className="sq-text-button sq-ink-act sq-busy-add sq-busy-add-small">Add</button>
      </form>
      {typedError && <p className="sq-busy-error" role="alert">{from && until ? 'End after start' : 'Pick both times'}</p>}

      {(model.windows.length > 0 || (!freeMode && model.mine.length > 0)) && (
        <ul className="sq-slips" aria-label={`Free and busy, ${dayName}`}>
          {model.windows.map(w => (
            <li key={'f' + w.first} className="sq-slip sq-slip-free">
              <span className="sq-slip-when"><i className="sq-key-free" aria-hidden="true" /><b>Free</b> {w.label}</span>
              {social && <WhosInButton slot={{ date: w.date, start: w.start, end: w.end, label: `${w.dayLabel} ${w.label}` }} />}
              {freeMode
                ? <button type="button" className="sq-slip-x" aria-label={`Not free ${w.label}`} onClick={() => onUnbusy(w)}>×</button>
                : <button type="button" className="sq-slip-act" aria-label={`Mark busy, ${w.dayLabel} ${w.label}`} onClick={() => onFillGap(w)}>Mark busy</button>}
              <OpenNowLine slot={{ date: w.date, start: w.start, end: w.end }} />
            </li>
          ))}
          {!freeMode && model.mine.map(r => (
            <li key={'m' + r.first} className="sq-slip sq-slip-mine">
              <span className="sq-slip-when"><i className="sq-key-mine" aria-hidden="true" /><b>Busy</b> {r.label}</span>
              <button type="button" className="sq-slip-x" aria-label={`Free again ${r.label}`} onClick={() => onUnbusy(r)}>×</button>
            </li>
          ))}
        </ul>
      )}

      {social && <GroupFitNote />}
      <div className="sq-marks-foot">
        {fitText && <p className="sq-fit-note" role="status">{fitText}</p>}
        {onClear && <button type="button" className="sq-text-button sq-clear-marks" onClick={onClear}>Show all events</button>}
        {onClearBusy && <button type="button" className="sq-text-button sq-clear-marks sq-clear-busy" onClick={onClearBusy}>Clear busy time</button>}
      </div>
      </div>
      </div>
    </section>
  )
}

type Drag = { kind: 'new' | 'move' | 'start' | 'end'; from: MarkRun | null; anchor: number; grab: number; first: number; last: number; lo: number; hi: number; moved: boolean }
const EDGE_PX = 14

/** The day as a strip you can draw on. Pointer only; the form and slips beside it do the same jobs by keyboard. */
function DayBar({ model, past, onReshape }: { model: MarkModel; past: number; onReshape: (from: { first: number; last: number } | null, first: number, last: number) => void }) {
  const n = model.cells.length
  const bar = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [blueNote, setBlueNote] = useState<number | null>(null)
  const pct = (i: number) => (i / n) * 100
  useEffect(() => { if (blueNote === null) return; const t = setTimeout(() => setBlueNote(null), 4000); return () => clearTimeout(t) }, [blueNote])
  const geom = () => bar.current!.getBoundingClientRect()
  // Five-minute steps: the controller says which step a pointer is over.
  const cellAt = (x: number) => { const r = geom(); return cellAtX(x, r.left, r.width) }
  const minOf = (i: number) => DAY_START + i * CELL

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const c = cellAt(e.clientX), state = model.cells[c]?.state
    const run = model.mine.find(r => c >= r.first && c <= r.last)
    setBlueNote(null)
    // My Schedule blocks and the past are walls: a busy block stops at them and never slides under.
    const open = (i: number) => i >= 0 && i < n && model.cells[i].state !== 'busy' && model.cells[i].state !== 'past'
    let lo = c, hi = c
    while (open(lo - 1)) lo--
    while (open(hi + 1)) hi++
    let d: Drag | null = null
    if (run) {
      const r = geom(), lx = r.left + (pct(run.first) / 100) * r.width, rx = r.left + (pct(run.last + 1) / 100) * r.width
      const kind = e.clientX - lx < EDGE_PX ? 'start' : rx - e.clientX < EDGE_PX ? 'end' : 'move'
      d = { kind, from: run, anchor: c, grab: c - run.first, first: run.first, last: run.last, lo, hi, moved: false }
    } else if (state === 'busy') { setBlueNote(c); return }
    else if (state === 'past') return
    else d = { kind: 'new', from: null, anchor: c, grab: 0, first: c, last: c, lo, hi, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(d)
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const c = Math.max(drag.lo, Math.min(drag.hi, cellAt(e.clientX)))
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
    if (d.kind === 'new') {
      // A tap with no drag marks one hour from that step.
      const last = d.moved ? d.last : Math.min(d.hi, d.first + TAP_CELLS - 1)
      onReshape(null, d.first, last)
    } else if (d.moved && d.from) onReshape({ first: d.from.first, last: d.from.last }, d.first, d.last)
  }

  const hidden = drag?.from ? drag.from.first : -1
  // In Free mode the blocks you draw are your free time, so they look free (gold), not busy.
  const freeBlocks = model.mode === 'free' ? ' sq-mbar-mine-free' : ''
  return (
    <div className={'sq-mbar' + (drag ? ' sq-mbar-dragging sq-mbar-' + drag.kind : '')} ref={bar} aria-hidden="true"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      <div className="sq-mbar-paper">
        {past > 0 && <i className="sq-mbar-past" style={{ width: pct(past) + '%' }} />}
        {model.free.map(r => <i key={'f' + r.first} className="sq-mbar-free" style={{ left: r.left + '%', width: r.width + '%' }} />)}
        {model.busy.map(r => <i key={'b' + r.first} className="sq-mbar-busy" style={{ left: r.left + '%', width: r.width + '%' }} />)}
        {model.mine.filter(r => r.first !== hidden).map(r => <i key={'m' + r.first} className={`sq-mbar-mine sq-mbar-grab${freeBlocks}`} style={{ left: r.left + '%', width: r.width + '%' }} />)}
        {drag && <i className={`sq-mbar-mine sq-mbar-ghost${freeBlocks}`} style={{ left: pct(drag.first) + '%', width: pct(drag.last + 1) - pct(drag.first) + '%' }} />}
      </div>
      {drag && <span className="sq-mbar-drag-time" style={{ left: pct((drag.first + drag.last + 1) / 2) + '%' }}>{span(minOf(drag.first), minOf(drag.last + 1))}</span>}
      {blueNote !== null && (
        <span className="sq-mbar-blue-note" style={{ left: Math.max(14, Math.min(86, pct(blueNote))) + '%' }} onPointerDown={e => e.stopPropagation()}>
          From My Schedule. <a href="#schedule" tabIndex={-1}>Change it there</a>
        </span>
      )}
    </div>
  )
}
