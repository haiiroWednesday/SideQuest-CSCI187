// VIEW: tell SideQuest when you're busy; it works out the free gaps.
// The bar is a picture of the day. Busy time is typed, or a whole gap is marked "Busy then".
// Dragging on the bar was tried and dropped (Nov 24): it confused people.
// The controller owns the half-hour math; this view reports taps and typed times.
import { useState } from 'react'
import type { MarkModel, MarkRun, MarkWindow, When } from '../controller/freeMarks'
import { DateStamp } from './DateStamp'
import { TimePick } from './Pickers'
import './gaps.css'
import './marks.css'

export function FreeMarker({ model, fitText, onDate, onWhen, onAddBusy, onFillGap, onUnbusy, onClear }: {
  model: MarkModel
  fitText: string | null
  onDate: (date: string) => void
  onWhen: (key: When) => void
  /** Returns false when the times make no sense. */
  onAddBusy: (start: string, end: string) => boolean
  onFillGap: (w: MarkWindow) => void
  onUnbusy: (run: MarkRun) => void
  onClear: (() => void) | null
}) {
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  const [typedError, setTypedError] = useState(false)
  const day = model.days.find(d => d.selected)!
  const dayName = day.today ? 'today' : `${day.dow} ${day.day}`
  const past = model.cells.filter(c => c.state === 'past').length

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = Boolean(from && until) && onAddBusy(from, until)
    setTypedError(!ok)
    if (ok) { setFrom(''); setUntil('') }
  }

  return (
    <section className="sq-gaps sq-marks" aria-labelledby="sq-discover-title">
      <div className="sq-gaps-head">
        <span className="sq-stamp"><DateStamp dow={model.stamp.dow} day={model.stamp.day} month={model.stamp.month} year={model.stamp.year} /></span>
        <div>
          <h1 id="sq-discover-title">What fits your gaps?</h1>
          <p>Add when you're busy. The gold gaps are free.</p>
          <nav className="sq-look-links" aria-label="Also on Discover"><a className="sq-look-link sq-look-link-map" href="#map">See it on the map</a></nav>
        </div>
      </div>

      <div className="sq-marks-cols">
      <div className="sq-marks-left">
      <div className="sqm-toggle sq-when" role="group" aria-label="When to look">
        {model.shortcuts.map(s => (
          <button key={s.key} type="button" aria-pressed={s.on} onClick={() => onWhen(s.key)}>{s.label}</button>
        ))}
      </div>
      {model.whenNote && <p className="sq-when-note" role="status">{model.whenNote}</p>}

      <div className="sq-days" role="group" aria-label="Day">
        {model.days.map(d => (
          <button key={d.date} type="button" className="sq-dayleaf" aria-pressed={d.selected}
            onClick={() => onDate(d.date)}>
            <span className="sq-dayleaf-dow">{d.dow}</span>
            <span className="sq-dayleaf-num">{d.day}</span>
            <span className="sq-visually-hidden">{d.month}{d.marked ? ', has busy time' : ''}</span>
            {d.marked > 0 && <i className="sq-dayleaf-dab" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="sq-mbar-wrap">
        <div className="sq-mbar-labels" aria-hidden="true">
          {model.free.map(r => <span key={r.first} className="sq-mbar-label" style={{ left: r.left + '%', width: r.width + '%' }}>{r.label}</span>)}
        </div>
        <div className="sq-mbar" aria-hidden="true">
          <div className="sq-mbar-paper">
            {past > 0 && <i className="sq-mbar-past" style={{ width: (past / model.cells.length) * 100 + '%' }} />}
            {model.free.map(r => <i key={'f' + r.first} className="sq-mbar-free" style={{ left: r.left + '%', width: r.width + '%' }} />)}
            {model.busy.map(r => <i key={'b' + r.first} className="sq-mbar-busy" style={{ left: r.left + '%', width: r.width + '%' }} />)}
            {model.mine.map(r => <i key={'m' + r.first} className="sq-mbar-mine" style={{ left: r.left + '%', width: r.width + '%' }} />)}
          </div>
        </div>
        <div className="sq-mbar-ticks" aria-hidden="true">
          {model.ticks.map(t => <span key={t.label} style={{ left: t.left + '%' }}>{t.label}</span>)}
        </div>
        <p className="sq-mbar-key"><a href="#schedule" aria-label="My Schedule, change your plans there"><i className="sq-key-busy" aria-hidden="true" />My Schedule</a> <span><i className="sq-key-mine" aria-hidden="true" />busy</span> <span><i className="sq-key-free" aria-hidden="true" />free</span></p>
      </div>

      </div>
      <div className="sq-marks-right">
      <form className="sq-busy-form" onSubmit={submit} aria-label={`Add busy time, ${dayName}`}>
        <span className="sq-busy-form-name" aria-hidden="true">Busy</span>
        <TimePick label="Busy from" placeholder="From" value={from} onChange={v => { setFrom(v); setTypedError(false) }} firstHour={8} lastHour={22} />
        <span aria-hidden="true">–</span>
        <TimePick label="until" placeholder="Until" value={until} onChange={v => { setUntil(v); setTypedError(false) }} firstHour={8} lastHour={23} />
        <button type="submit" className="sq-plan-button sq-busy-add">Add</button>
        {typedError && <p className="sq-busy-error" role="alert">{from && until ? 'End after start' : 'Pick both times'}</p>}
      </form>

      {(model.windows.length > 0 || model.mine.length > 0) && (
        <ul className="sq-slips" aria-label={`Free and busy, ${dayName}`}>
          {model.windows.map(w => (
            <li key={'f' + w.first} className="sq-slip sq-slip-free">
              <span className="sq-slip-when"><i className="sq-key-free" aria-hidden="true" /><b>Free</b> {w.label}</span>
              <button type="button" className="sq-slip-act" aria-label={`Busy then, ${w.dayLabel} ${w.label}`} onClick={() => onFillGap(w)}>Busy then</button>
            </li>
          ))}
          {model.mine.map(r => (
            <li key={'m' + r.first} className="sq-slip sq-slip-mine">
              <span className="sq-slip-when"><i className="sq-key-mine" aria-hidden="true" /><b>Busy</b> {r.label}</span>
              <button type="button" className="sq-slip-x" aria-label={`Free again ${r.label}`} onClick={() => onUnbusy(r)}>×</button>
            </li>
          ))}
        </ul>
      )}

      <div className="sq-marks-foot">
        {fitText && <p className="sq-fit-note" role="status">{fitText}</p>}
        {onClear && <button type="button" className="sq-text-button sq-clear-marks" onClick={onClear}>Show everything</button>}
      </div>
      </div>
      </div>
    </section>
  )
}
