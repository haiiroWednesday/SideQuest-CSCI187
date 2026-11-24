// VIEW: one clash, laid out to decide. All the clashing plans share one time ruler, so the
// overlap shows as a band you can see. Each plan says where and who, and offers one choice.
import { useEffect, useRef } from 'react'
import type { ClashModel } from '../controller/presentClash'
import { categoryStyle } from './categoryColors'
import { Greetings } from './Greetings'
import { NowMark } from './Marks'
import './clash.css'

export function ClashSheet({ clashes, onClose, onRemove }: {
  /** Every clash on one day. */
  clashes: ClashModel[]
  onClose: () => void
  onRemove: (id: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) { d.showModal?.(); d.querySelector<HTMLButtonElement>('.sq-clash-close')?.focus() }
  }, [])
  const keepOnly = (clash: ClashModel, id: string) => { clash.plans.filter(p => p.id !== id).forEach(p => onRemove(p.id)); if (clashes.length === 1) onClose() }
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

          <ul className="sq-clash-plans">
            {clash.plans.map(p => (
              <li key={p.id} className="sq-clash-plan" style={categoryStyle(p.category)}>
                <span className="sq-clash-face" aria-hidden="true"><Greetings location={p.location} small /></span>
                <h3>{p.title}</h3>
                {p.live && <NowMark />}
                <p className="sq-clash-time">{p.time}</p>
                <dl>
                  {p.location && <><dt>Where</dt><dd>{p.location}</dd></>}
                  {p.host && <><dt>Host</dt><dd>{p.host}</dd></>}
                  <dt>Overlap</dt><dd className="sq-clash-over">{p.overlapText}</dd>
                </dl>
                <div className="sq-clash-acts">
                  <button type="button" className="sq-plan-button" onClick={() => keepOnly(clash, p.id)}>Keep only this<span className="sq-visually-hidden">: {p.title}</span></button>
                  <button type="button" className="sq-text-button sq-clash-drop" onClick={() => removeOne(clash, p.id)}>Remove<span className="sq-visually-hidden"> {p.title}</span></button>
                </div>
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
