// VIEW (design review): the open group's day as a timetable, after printed Japanese festival timetables.
// One narrow column per person who shares (their initial in the circle the group cards use), time
// running down the page, free time as a flat gold block and everything else blank paper. The stretch
// when everyone who shared is free is one band across those columns with its time written once at
// the left. Tapping the band filters the propose list to events that fit it.
// Who gets a column, what a band is and what fits one are rules in controller/groupsPreview
// (groupTimetable, eventsInWindow) and controller/socialPlans (personColumns). This file only draws
// them and passes taps back. It never sees what anyone is busy with: the data has no room for it.
import { useEffect, useRef } from 'react'
import { clock, span } from '../controller/freeMarks'
import { personColor } from '../controller/groupPeople'
import { groupTimetable, windowLabel, type TimetableBand, type TimetableColumn } from '../controller/groupsPreview'
import type { CommonTime, Slot } from '../controller/socialPlans'
import './group-timetable.css'

/** Half a pixel a minute: an hour is 30px, the whole day (8am to 11pm) 450px. */
const MIN_PX = 0.5
/** A band's label is a button: tall enough to tap on a phone, where the page is drawn at .88 (44px there is 50px here). */
const LABEL_PX = 52
const TICK_EVERY = 120
/**
 * Columns stay narrow: never under `least`, never wider than 64px, 3px apart. A sharer's column needs
 * 34px for the initial. A "not shared" column needs 54px so its words keep clear of the dotted line.
 */
const widths = (n: number, least: number) => ({ minWidth: n * (least + 3) - 3, maxWidth: n * 67 - 3 })

const same = (a: Slot | null, b: Slot) => !!a && a.date === b.date && a.start === b.start && a.end === b.end
const slotOf = (b: TimetableBand): Slot => ({ date: b.date, start: b.start, end: b.end })
const names = (people: readonly string[]) => people.length < 3 ? people.join(' and ') : `${people.slice(0, -1).join(', ')} and ${people[people.length - 1]}`
const freeWords = (col: TimetableColumn) => col.free.length ? `free ${col.free.map(b => span(b.from, b.to)).join(' and ')}` : 'no free time'

export function GroupTimetable({ common, date, day, chosen, onBand }: {
  /** One commonTime result for the open group, and the day picked in the day picker above. */
  common: CommonTime
  date: string
  /** That day in words ("Today", "Wed 25"), for the accessible name only: the day picker shows it. */
  day: string
  chosen: Slot | null
  onBand: (band: Slot | null) => void
}) {
  const table = groupTimetable(common, date)
  // Nothing to draw: you have not shared, nobody else has, or a pair has no common time that day.
  if (!table || (!table.columns && !table.bands.length)) return null
  const y = (m: number) => (m - table.from) * MIN_PX
  const height = y(table.to)
  const sharers = table.columns?.filter(c => c.shared) ?? []
  const rest = table.columns?.filter(c => !c.shared) ?? []

  // A label sits beside the middle of its band. Two bands close together push the later label down.
  let floor = 0
  const labelTop = table.bands.map(b => {
    const top = Math.max((y(b.from) + y(b.to)) / 2 - LABEL_PX / 2, floor)
    floor = top + LABEL_PX + 2
    return top
  })
  const ticks: number[] = []
  for (let m = table.from; m < table.to; m += TICK_EVERY) ticks.push(m)
  // An hour mark steps aside where a band's time is written.
  const clear = (m: number) => labelTop.every(top => y(m) < top - 12 || y(m) > top + LABEL_PX + 12)
  const widest = table.bands.reduce((w, b) => b.label.length > w.length ? b.label : w, '')
  const toggle = (b: TimetableBand) => onBand(same(chosen, b) ? null : slotOf(b))

  return (
    <div className="sq-gt" data-testid="group-timetable" data-mode={table.columns ? 'columns' : 'band'}>
      <div className="sq-gt-scroll">
        <div className="sq-gt-grid" role="group" aria-label={`Free time, ${day}`}>
          <div className="sq-gt-axis" style={{ height: Math.max(height, floor) }}>
            {/* Holds the gutter as wide as the longest time, since the labels themselves are placed by hand. */}
            {widest && <span className="sq-gt-sizer" aria-hidden="true"><b>{widest},</b><span>everyone</span></span>}
            {ticks.filter(clear).map(m => <span key={m} className="sq-gt-tick" aria-hidden="true" style={{ top: y(m) }}>{m === 720 ? 'noon' : clock(m)}</span>)}
            {table.bands.map((b, i) => (
              <button key={b.start} type="button" className="sq-gt-band" aria-pressed={same(chosen, b)} style={{ top: labelTop[i], height: LABEL_PX }} onClick={() => toggle(b)}>
                <b>{b.label},</b> <span>everyone</span><span className="sq-visually-hidden"> free. Show events that fit</span>
              </button>
            ))}
          </div>
          <div className="sq-gt-share" style={table.columns ? { flexGrow: sharers.length, ...widths(sharers.length, 34) } : undefined}>
            <div className="sq-gt-under" aria-hidden="true" style={{ height }}>
              {ticks.map(m => <i key={m} className="sq-gt-line" style={{ top: y(m) }} />)}
            </div>
            {table.columns ? (
              <ul className="sq-gt-cols" style={{ gridTemplateColumns: `repeat(${sharers.length}, minmax(34px, 1fr))` }}>
                {sharers.map(col => (
                  <li key={col.key} className="sq-gt-col">
                    <span className="sq-gt-face" aria-hidden="true" style={{ background: personColor(col.key) }}>{col.key[0]}</span>
                    <span className="sq-visually-hidden">{col.key}, {freeWords(col)}</span>
                    <span className="sq-gt-lane" style={{ height }}>
                      {col.free.map(b => <i key={b.from} className="sq-gt-free" style={{ top: y(b.from), height: y(b.to) - y(b.from) }} />)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <div className="sq-gt-lane sq-gt-open" style={{ height }} />}
            <div className="sq-gt-over" aria-hidden="true" style={{ height }}>
              {table.bands.map(b => (
                <i key={b.start} className="sq-gt-fill" data-on={same(chosen, b) || undefined} style={{ top: y(b.from), height: y(b.to) - y(b.from) }} onClick={() => toggle(b)} />
              ))}
            </div>
          </div>
          {rest.length > 0 && (
            <ul className="sq-gt-cols sq-gt-rest" style={{ flexGrow: rest.length, ...widths(rest.length, 54), gridTemplateColumns: `repeat(${rest.length}, minmax(54px, 1fr))` }}>
              {rest.map(col => (
                <li key={col.key} className="sq-gt-col sq-gt-off">
                  <span className="sq-gt-face sq-gt-face-off" aria-hidden="true">{col.people.length > 1 ? col.people.length : col.key[0]}</span>
                  <span className="sq-gt-lane" style={{ height }}>
                    <span className="sq-gt-not"><span className="sq-visually-hidden">{names(col.people)}, </span>not shared</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {!table.columns && <p className="sq-gt-few">Each person's column shows once 3 share.</p>}
    </div>
  )
}

/**
 * Above the propose list while it shows what fits a band. Scrolls itself into view on a phone, where
 * the list sits below the timetable, so the tap visibly "opens" the list.
 */
export function BandFit({ band, count, onClear }: { band: Slot; count: number; onClear: () => void }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const key = `${band.date} ${band.start} ${band.end}`
  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.scrollIntoView !== 'function') return
    const r = el.getBoundingClientRect()
    if (r.top >= 0 && r.bottom <= window.innerHeight - 120) return
    const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' })
  }, [key])
  const when = windowLabel(band)
  return (
    <p className="sq-gt-fits" role="status" ref={ref}>
      <span>{count ? `Fits everyone, ${when}` : `Nothing fits ${when}`}</span>
      <button type="button" className="sq-text-button sq-ink-act" onClick={onClear}>All events</button>
    </p>
  )
}
