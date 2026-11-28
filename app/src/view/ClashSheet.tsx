// VIEW: the clash chooser. Clashing plans share one time strip, so the overlap shows as a hatched band.
// Under each ticket sit only the facts the plans do not share, in the same order, so the eye compares
// rows. One tap keeps a plan and removes the ones it clashes with. The comparing is done by the controller.
import { Fragment, useEffect, useRef, type CSSProperties } from 'react'
import { goingCell, rowsBelowTickets, whatDiffers, type ClashModel } from '../controller/presentClash'
import { categoryStyle } from './categoryColors'
import { EventStub } from './DiscoverView'
import { ScheduleDayModes } from './ScheduleModes'
import type { DayTimeline } from '../controller/scheduleTimeline'
import type { PlanStubModel } from '../controller/presentScreens'
import { useGoing } from './FriendsGoing'
import './clash.css'
import './clash-chooser.css'

const listed = (names: readonly string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/** The day's own trail, so the sheet draws each clash exactly as My Schedule draws it (Cyn, Nov 26: the clash
 *  picture must match the other timelines). Each clash shows only its own plans. */
export type ClashTrail = { events: PlanStubModel[]; timeline: DayTimeline; isToday: boolean; date: string; now?: Date }

/** The day's trail cut down to one clash: only its plans, from the hour before it starts to the hour after it ends. */
function clashTimeline(day: DayTimeline, ids: readonly string[]): DayTimeline {
  const items = day.items.filter(t => ids.includes(t.id))
  if (!items.length) return day
  return {
    items,
    firstMinute: Math.floor(Math.min(...items.map(t => t.startMinute)) / 60) * 60,
    lastMinute: Math.ceil(Math.max(...items.map(t => t.endMinute)) / 60) * 60,
  }
}

export function ClashSheet({ clashes, onClose, onRemove, onRemoveMany, trail }: {
  /** Every clash on one day. */
  clashes: ClashModel[]
  onClose: () => void
  onRemove: (id: string) => void
  /** "Keep this one" as one change, so one toast names every plan removed and one Undo brings them back. */
  onRemoveMany?: (ids: readonly string[]) => void
  trail?: ClashTrail
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Friends going shows only where the page provides it (your groups, opted in). Without it the row is left out.
  const going = useGoing()
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) { d.showModal?.(); d.querySelector<HTMLButtonElement>('.sq-clash-close')?.focus() }
  }, [])
  const keepPlan = (ids: readonly string[]) => {
    if (onRemoveMany) onRemoveMany(ids); else ids.forEach(onRemove)
    if (clashes.length === 1) onClose()
  }
  const many = clashes.length > 1
  const plansCount = clashes.reduce((n, c) => n + c.plans.length, 0)

  return (
    <dialog ref={ref} className="sq-clash sq-clash-chooser" aria-labelledby="sq-clash-title" onCancel={e => { e.preventDefault(); onClose() }}
      onClick={e => { if (e.target === ref.current) onClose() }}>
      <div className="sq-clash-inner">
        <header className="sq-clash-head">
          <h2 id="sq-clash-title"><span className="sq-clash-tag">Clash</span>{clashes[0].dayLabel}</h2>
          <button type="button" className="sq-clash-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        {clashes.map(clash => {
          const rows = rowsBelowTickets(whatDiffers(clash.plans.map(p => ({ ...p.facts, going: goingCell(going?.going(p.id)) }))))
          const pair = clash.plans.length === 2
          return (
            <section key={clash.key} className="sq-clash-group" aria-label={clash.summary}>
              {many && <h3 className="sq-clash-when">{clash.summary}</h3>}
              {trail ? (
                <figure className="sq-clash-ruler sq-clash-trail" aria-label={`${clash.summary}. Overlap ${clash.overlaps.map(o => o.label).join(' and ')}.`}>
                  <ScheduleDayModes mode="trail" events={trail.events.filter(e => clash.plans.some(p => p.id === e.id))}
                    timeline={clashTimeline(trail.timeline, clash.plans.map(p => p.id))}
                    now={trail.now} isToday={trail.isToday} date={trail.date} selectedId={null} onOpen={() => {}} onOpenTickets={() => {}} />
                </figure>
              ) : (
                <figure className={`sq-clash-ruler sq-clash-strip${clash.overlaps.length > 1 ? ' sq-clash-strip-many' : ''}`} aria-label={`${clash.summary}. Overlap ${clash.overlaps.map(o => o.label).join(' and ')}.`}>
                  <div className="sq-clash-lanes" aria-hidden="true" style={{ '--lanes': clash.plans.length } as CSSProperties}>
                    {clash.plans.map(p => (
                      <Fragment key={p.id}>
                        <span className="sq-clash-name">{p.title}</span>
                        <div className="sq-clash-row" style={categoryStyle(p.category)}>
                          <span className="sq-clash-bar" style={{ left: p.left + '%', width: p.width + '%' }} />
                        </div>
                      </Fragment>
                    ))}
                    <div className="sq-clash-bands">
                      {clash.overlaps.map(o => <i key={o.left} className="sq-clash-band" style={{ left: o.left + '%', width: o.width + '%' }}><b>{o.label}</b></i>)}
                    </div>
                    <div className="sq-clash-ticks">{clash.ticks.map(t => <span key={t.left} style={{ left: t.left + '%' }}>{t.label}</span>)}</div>
                  </div>
                </figure>
              )}

              <ul className={`sq-clash-choices ${pair ? 'sq-clash-pair' : 'sq-clash-list'}`} style={{ '--rows': rows.length } as CSSProperties}>
                {clash.plans.map((p, i) => (
                  <li key={p.id} className="sq-clash-plan">
                    {/* The shared ticket, inside the list shape every ticket sits in, so it is drawn the same way here. */}
                    <ul className="sq-stubs sq-stubs-one sq-clash-plans" role="presentation">
                      <li role="presentation"><EventStub compact stub={p.stub} /></li>
                    </ul>
                    {rows.length > 0 && (
                      <dl className="sq-clash-differs">
                        {rows.map(row => (
                          <div key={row.key} className="sq-clash-differ" data-differs={row.key}>
                            <dt>{row.label}</dt>
                            <dd>{row.cells[i]}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <p className="sq-clash-act">
                      <button type="button" className="sq-text-button sq-ink-act sq-clash-keep" onClick={() => keepPlan(p.conflictingIds)}>Keep this one<span className="sq-visually-hidden">: {p.title}, and remove {listed(p.removes)}</span></button>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <footer className="sq-clash-foot">
          <button type="button" className="sq-text-button sq-clash-all" onClick={onClose}>{plansCount > 2 ? 'Keep all' : 'Keep both'}</button>
        </footer>
      </div>
    </dialog>
  )
}
