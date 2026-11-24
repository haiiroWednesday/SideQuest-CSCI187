// VIEW: our own time and date pickers (Nov 24), replacing the browser's "--:-- --" boxes.
// A time is picked in two taps: the hour, grouped into morning, afternoon and evening, then the minutes.
// A date is picked from a month of days. Both report values in the same shapes the form already uses
// ("15:30" and "2026-11-25"), so the controllers do not change.
import { useEffect, useId, useRef, useState } from 'react'
import './pickers.css'

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`
}
const pad = (n: number) => String(n).padStart(2, '0')

/** Closes a popover on Escape or a tap outside it, and hands focus back to its button. */
/** Opens upward when there is no room below (the phone tab bar covers the bottom of the screen). */
function useRoom(open: boolean, button: React.RefObject<HTMLButtonElement | null>) {
  const [place, setPlace] = useState({ up: false, dx: 0 })
  useEffect(() => {
    if (!open || !button.current) return
    const r = button.current.getBoundingClientRect(), nav = document.querySelector('.sq-nav')?.getBoundingClientRect()
    const floor = nav && nav.top > innerHeight / 2 ? nav.top : innerHeight
    // Line up with the button's left edge, nudged so the card stays on screen.
    const w = Math.min(372, innerWidth - 24), want = Math.max(12, Math.min(r.left, innerWidth - 12 - w))
    setPlace({ up: floor - r.bottom < 360 && r.top > 380, dx: Math.round(want - r.left) })
  }, [open, button])
  return place
}

function useDismiss(open: boolean, close: () => void, root: React.RefObject<HTMLElement | null>, button: React.RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); button.current?.focus() } }
    const down = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close() }
    document.addEventListener('keydown', key, true); document.addEventListener('pointerdown', down, true)
    return () => { document.removeEventListener('keydown', key, true); document.removeEventListener('pointerdown', down, true) }
  }, [open, close, root, button])
}

export function TimePick({ id, label, value, onChange, step = 30, firstHour = 7, lastHour = 23, placeholder = 'Pick a time', invalid = false, describedBy }: {
  id?: string
  /** Read out with the button; shown by the caller's own label. */
  label: string
  value: string
  onChange: (v: string) => void
  step?: 15 | 30
  firstHour?: number
  lastHour?: number
  placeholder?: string
  invalid?: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null)
  const pid = useId()
  useDismiss(open, () => setOpen(false), box, btn)
  const { up, dx } = useRoom(open, btn)
  const [h, m] = value ? value.split(':').map(Number) : [NaN, 0]
  const minutes = step === 15 ? [0, 15, 30, 45] : [0, 30]
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i)
  const parts: [string, number[]][] = [['Morning', hours.filter(x => x < 12)], ['Afternoon', hours.filter(x => x >= 12 && x < 17)], ['Evening', hours.filter(x => x >= 17)]]
  const setHour = (hour: number) => onChange(`${pad(hour)}:${pad(Number.isNaN(h) ? 0 : m)}`)
  const setMin = (min: number) => { onChange(`${pad(Number.isNaN(h) ? 12 : h)}:${pad(min)}`); setOpen(false); btn.current?.focus() }
  useEffect(() => { if (open) box.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"], .sq-pick-chip')?.focus() }, [open])
  return (
    <div className="sq-pick" ref={box}>
      <button ref={btn} id={id} type="button" className={`sq-pick-btn${value ? '' : ' sq-pick-empty'}`} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`${label}, ${value ? clock(value) : 'not set'}`} aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10L13 12" /></svg>
        <span>{value ? clock(value) : placeholder}</span>
      </button>
      {open && (
        <div className={`sq-pick-pop${up ? ' sq-pick-up' : ''}`} style={{ left: dx }} role="dialog" aria-label={label} id={pid}>
          {parts.filter(([, hs]) => hs.length).map(([name, hs]) => (
            <div key={name} className="sq-pick-row" role="group" aria-label={name}>
              <span className="sq-pick-part" aria-hidden="true">{name}</span>
              {hs.map(x => <button key={x} type="button" className="sq-pick-chip" aria-pressed={x === h} aria-label={`${x % 12 || 12}${x < 12 ? 'am' : 'pm'}`} onClick={() => setHour(x)}>{x % 12 || 12}</button>)}
            </div>
          ))}
          <div className="sq-pick-row sq-pick-mins" role="group" aria-label="Minutes">
            <span className="sq-pick-part" aria-hidden="true">Then</span>
            {minutes.map(x => <button key={x} type="button" className="sq-pick-chip" aria-pressed={!Number.isNaN(h) && x === m} onClick={() => setMin(x)}>:{pad(x)}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const iso = (y: number, mo: number, d: number) => `${y}-${pad(mo + 1)}-${pad(d)}`

export function DatePick({ id, label, value, onChange, min, max, invalid = false, describedBy }: {
  id?: string; label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; invalid?: boolean; describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null)
  useDismiss(open, () => setOpen(false), box, btn)
  const { up, dx } = useRoom(open, btn)
  const start = value || min || iso(2026, 10, 24)
  const [view, setView] = useState(() => { const [y, mo] = start.split('-').map(Number); return { y, mo: mo - 1 } })
  const first = new Date(Date.UTC(view.y, view.mo, 1)), lead = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(view.y, view.mo + 1, 0)).getUTCDate()
  const shift = (k: number) => setView(v => { const d = new Date(Date.UTC(v.y, v.mo + k, 1)); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() } })
  const shown = value ? (() => { const [y, mo, d] = value.split('-').map(Number); const w = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); return `${DOW[(w + 6) % 7]}, ${MONTHS[mo - 1].slice(0, 3)} ${d}` })() : 'Pick a day'
  useEffect(() => { if (open) box.current?.querySelector<HTMLButtonElement>('.sq-cal-day[aria-pressed="true"], .sq-cal-day:not(:disabled)')?.focus() }, [open])
  return (
    <div className="sq-pick" ref={box}>
      <button ref={btn} id={id} type="button" className={`sq-pick-btn${value ? '' : ' sq-pick-empty'}`} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`${label}, ${value ? shown : 'not set'}`} aria-invalid={invalid || undefined} aria-describedby={describedBy} onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12.5" rx="1.5" /><path d="M3 8.5H17M7 2.8V6M13 2.8V6" /></svg>
        <span>{shown}</span>
      </button>
      {open && (
        <div className={`sq-pick-pop sq-cal${up ? ' sq-pick-up' : ''}`} style={{ left: dx }} role="dialog" aria-label={label}>
          <div className="sq-cal-head">
            <button type="button" className="sq-cal-nav" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
            <b>{MONTHS[view.mo]} {view.y}</b>
            <button type="button" className="sq-cal-nav" aria-label="Next month" onClick={() => shift(1)}>›</button>
          </div>
          <div className="sq-cal-grid">
            {DOW.map(d => <span key={d} className="sq-cal-dow" aria-hidden="true">{d[0]}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
            {Array.from({ length: days }, (_, i) => {
              const v = iso(view.y, view.mo, i + 1), off = (min && v < min) || (max && v > max)
              return <button key={v} type="button" className="sq-cal-day" disabled={Boolean(off)} aria-pressed={v === value}
                aria-label={`${MONTHS[view.mo]} ${i + 1}`} onClick={() => { onChange(v); setOpen(false); btn.current?.focus() }}>{i + 1}</button>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
