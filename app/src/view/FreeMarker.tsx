// VIEW: tell SideQuest when you're busy; it works out the free gaps.
// Nov 27 (D7): the week view replaced the one-day bar. Busy time is dragged on the open day of the week,
// moved, or stretched by its ends (WeekBusy). My Schedule plans are walls and say where to change them.
// Typing a time, the list of busy times and Bring in a week sit under "Edit busy times" for keyboards.
// The controller owns the five-minute math; this view reports cells.
import { BringInBusy } from './BringInBusy'
import { useState } from 'react'
import type { MarkMode, MarkModel, MarkRun, MarkWindow, When } from '../controller/freeMarks'
import { WeekBusy } from './WeekBusy'
import { TimePick } from './Pickers'
import { GroupFitNote } from './Social'
import { OpenNowLine } from './OpenNow'
import { MAP_FITS_ROUTE } from '../controller/presentMap'
import './gaps.css'
import './marks.css'

export function FreeMarker({ model, fitText, onDate, onAddBusy, onUnbusy, onReshape, onEditBusy, onBringIn, onClear, onClearBusy = null, onMode, social = false }: {
  model: MarkModel
  fitText: string | null
  onDate: (date: string) => void
  /** Kept for callers; the time tags that used it are no longer drawn. */
  onWhen?: (key: When) => void
  /** Returns false when the times make no sense. */
  onAddBusy: (start: string, end: string) => boolean
  onUnbusy: (run: Pick<MarkRun, 'first' | 'last'>) => void
  onReshape: (from: { first: number; last: number } | null, first: number, last: number) => void
  /** New typed times for a busy time you already have. Returns false when they make no sense. */
  onEditBusy?: (run: MarkRun, start: string, end: string) => boolean
  /** Busy time brought in from a sentence, the mic or a calendar file, after the student ticks it. */
  onBringIn?: (blocks: { date: string; start: string; end: string }[]) => number
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
  const [editing, setEditing] = useState(false)
  const day = model.days.find(d => d.selected)!
  const dayName = day.today ? 'today' : `${day.dow} ${day.day}`
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
          <nav className="sq-look-links" aria-label="Also on Discover"><a className="sq-look-link sq-look-link-map" href={MAP_FITS_ROUTE}>See it on the map</a></nav>
        </div>
      </div>

      <div className="sq-marks-cols">
      <div className="sq-marks-left">
      {/* The day leaves are the only day control. The luggage time tags (This week / Now / This afternoon /
          Tonight) and the date stamp were taken off by owner decision on Nov 25; the controller still knows them. */}
      <div className="sq-mbar-wrap">
        {onMode && (
          <div className="sq-markmode" role="group" aria-label="What you mark on the week">
            <button type="button" aria-pressed={!freeMode} onClick={() => onMode('busy')}>Busy</button>
            <button type="button" aria-pressed={freeMode} onClick={() => onMode('free')}>Free</button>
          </div>
        )}
        <WeekBusy model={model} onDate={onDate} onReshape={onReshape} freeMode={freeMode} />
        <p className="sq-mbar-key"><a href="#schedule" aria-label="My Schedule, change your plans there"><i className="sq-key-busy" aria-hidden="true" />My Schedule</a> {freeMode
          ? <span><i className="sq-key-free" aria-hidden="true" />free, drag to add</span>
          : <><span><i className="sq-key-mine" aria-hidden="true" />busy, drag to add</span>{model.google.length > 0 && <> <span><i className="sq-key-google" aria-hidden="true" />Google Calendar</span></>} <span><i className="sq-key-free" aria-hidden="true" />free</span></>}</p>

      {/* Nov 27 (D6): typing a time, the list of busy times and Bring in a week open from one line, so the
          week itself is what you see first. */}
      <button type="button" className="sq-text-button sq-edit-busy" aria-expanded={editing} aria-controls="sq-edit-busy" onClick={() => setEditing(v => !v)}>
        {freeMode ? 'Type free times' : 'Edit busy times'}<span aria-hidden="true">{editing ? ' ▴' : ' ▾'}</span>
      </button>
      {editing && <div id="sq-edit-busy" className="sq-edit-busy-panel">
      {/* Nov 25, Cyn: typing a time sits right under the bar it adds to, and every busy time you have is
          listed with times you can change by tapping them. Drag still works on the bar above. */}
      <form className="sq-busy-form sq-busy-row" onSubmit={submit} aria-label={`Add ${markName.toLowerCase()} time, ${dayName}`}>
        <span className="sq-busy-form-name" aria-hidden="true">Busy</span>
        <TimePick label={`${markName} from`} placeholder="From" value={from} onChange={v => { setFrom(v); setTypedError(false) }} step={5} firstHour={0} lastHour={23} />
        <span aria-hidden="true">–</span>
        <TimePick label="until" placeholder="Until" value={until} onChange={v => { setUntil(v); setTypedError(false) }} step={5} firstHour={0} lastHour={23} />
        <button type="submit" className="sq-text-button sq-ink-act sq-busy-add sq-busy-add-small">{!freeMode && model.mine.length > 0 ? 'Add another' : 'Add'}</button>
      </form>
      {typedError && <p className="sq-busy-error" role="alert">{from && until ? 'End after start' : 'Pick both times'}</p>}
      {!freeMode && model.mine.length > 0 && (
        <ul className="sq-busy-list" aria-label={`Your busy times, ${dayName}`}>
          {model.mine.map(r => <BusyTime key={r.first} run={r} google={model.google.some(g => g.first <= r.first && g.last >= r.last)} onEdit={onEditBusy} onRemove={() => onUnbusy(r)} />)}
        </ul>
      )}
      {!freeMode && onBringIn && model.days[0] && <BringInBusy today={model.days[0].date} onAdd={onBringIn} />}
      </div>}
      </div>

      </div>
      <div className="sq-marks-right">
      {model.windows.length > 0 && (
        <ul className="sq-slips" aria-label={`Free time, ${dayName}`}>
          {model.windows.map(w => (
            <li key={'f' + w.first} className="sq-slip sq-slip-free" data-start={w.start} data-end={w.end}>
              <span className="sq-slip-when"><i className="sq-key-free" aria-hidden="true" /><b>Free</b> {w.label}</span>
              {/* Nov 27, Cyn's picks: "Who's in?" has one entrance, in Groups (C6), and "Mark busy" is gone (C2).
                  Busy time is added on the week or under "Edit busy times". */}
              {freeMode && <button type="button" className="sq-slip-x" aria-label={`Not free ${w.label}`} onClick={() => onUnbusy(w)}>×</button>}
              <OpenNowLine slot={{ date: w.date, start: w.start, end: w.end }} />
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

function BusyTime({ run, google = false, onEdit, onRemove }: { run: MarkRun; google?: boolean; onEdit?: (r: MarkRun, start: string, end: string) => boolean; onRemove: () => void }) {
  const [error, setError] = useState(false)
  const change = (start: string, end: string) => { const ok = onEdit ? onEdit(run, start, end) : false; setError(!ok) }
  return (
    <li className={'sq-busy-time' + (google ? ' sq-busy-time-google' : '')}>
      {google ? <span className="sq-busy-tag sq-google-tag">Google</span> : <span className="sq-busy-tag">Yours</span>}
      {onEdit
        ? <>
            <TimePick label={`Busy ${run.label}, starts`} placeholder="From" value={run.start} onChange={v => change(v, run.end)} step={5} firstHour={0} lastHour={23} />
            <span aria-hidden="true">–</span>
            <TimePick label={`Busy ${run.label}, ends`} placeholder="Until" value={run.end} onChange={v => change(run.start, v)} step={5} firstHour={0} lastHour={23} />
          </>
        : <span className="sq-busy-time-label">{run.label}</span>}
      <button type="button" className="sq-slip-x" aria-label={`Free again ${run.label}`} onClick={onRemove}>×</button>
      {error && <span className="sq-busy-error" role="alert">End after start</span>}
    </li>
  )
}
