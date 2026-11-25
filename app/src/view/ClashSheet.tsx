// VIEW: one clash, laid out to decide. All the clashing plans share one time ruler, so the
// overlap shows as a band you can see. Each plan says where and who, and offers one choice.
import { useEffect, useRef } from 'react'
import type { ClashModel } from '../controller/presentClash'
import { categoryStyle } from './categoryColors'
import { EventStub } from './DiscoverView'
import './clash.css'

export function ClashSheet({ clashes, onClose, onRemove, onRemoveMany }: {
  /** Every clash on one day. */
  clashes: ClashModel[]
  onClose: () => void
  onRemove: (id: string) => void
  /** "Keep this, remove conflicts" as one change, so one toast names every plan removed and one Undo brings them back. */
  onRemoveMany?: (ids: readonly string[]) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) { d.showModal?.(); d.querySelector<HTMLButtonElement>('.sq-clash-close')?.focus() }
  }, [])
  const keepPlan = (ids: readonly string[]) => {
    if (onRemoveMany) onRemoveMany(ids); else ids.forEach(onRemove)
    if (clashes.length === 1) onClose()
  }
  const removeOne = (clash: ClashModel, id: string) => { onRemove(id); if (clashes.length === 1 && clash.plans.length <= 2) onClose() }
  const many = clashes.length > 1
  const plansCount = clashes.reduce((n, c) => n + c.plans.length, 0)

  return (
    <dialog ref={ref} className="sq-clash" aria-labelledby="sq-clash-title" onCancel={e => { e.preventDefault(); onClose() }}
      onClick={e => { if (e.target === ref.current) onClose() }}>
      <div className="sq-clash-inner">
        <header className="sq-clash-head">
          <h2 id="sq-clash-title"><span className="sq-clash-tag">Clash</span>{clashes[0].dayLabel}</h2>
          <button type="button" className="sq-clash-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        {clashes.map(clash => (
          <section key={clash.key} className="sq-clash-group" aria-label={clash.summary}>
            {many && <h3 className="sq-clash-when">{clash.summary}</h3>}
          <figure className="sq-clash-ruler" aria-label={`${clash.summary}. Overlap ${clash.overlaps.map(o => o.label).join(' and ')}.`}>
            <div className="sq-clash-rows" aria-hidden="true">
              {clash.overlaps.map(o => <i key={o.left} className="sq-clash-band" style={{ left: o.left + '%', width: o.width + '%' }}><b>{o.label}</b></i>)}
              {clash.plans.map(p => (
                <div key={p.id} className="sq-clash-row" style={categoryStyle(p.category)}>
                  <span className="sq-clash-bar" style={{ left: p.left + '%', width: p.width + '%' }}><span>{p.title}</span></span>
                </div>
              ))}
            </div>
            <div className="sq-clash-ticks" aria-hidden="true">{clash.ticks.map(t => <span key={t.left} style={{ left: t.left + '%' }}>{t.label}</span>)}</div>
          </figure>

          <ul className="sq-stubs sq-clash-plans">
            {clash.plans.map(p => (
              <li key={p.id} className="sq-clash-plan">
                <EventStub compact stub={p.stub}>
                  <span className="sq-clash-over">{p.overlapText}</span>
                  <span className="sq-clash-acts">
                    <button type="button" className="sq-plan-button" onClick={() => keepPlan(p.conflictingIds)}>Keep this one<span className="sq-visually-hidden">: {p.title}, and remove the plans it clashes with</span></button>
                    <button type="button" className="sq-text-button sq-clash-drop" onClick={() => removeOne(clash, p.id)}>Remove<span className="sq-visually-hidden"> {p.title}</span></button>
                  </span>
                </EventStub>
              </li>
            ))}
          </ul>
          </section>
        ))}

        <footer className="sq-clash-foot">
          <button type="button" className="sq-text-button" onClick={onClose}>{plansCount > 2 ? 'Keep all' : 'Keep both'}</button>
        </footer>
      </div>
    </dialog>
  )
}
