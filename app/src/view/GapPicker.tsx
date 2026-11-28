// VIEW: the day ruler on Discover. Gaps, busy blocks and positions come from the Controller.
import type { GapPart, GapsModel } from '../controller/presentGaps'
import type React from 'react'
import './gaps.css'

const PARTS: [GapPart | 'pick', string][] = [['now', 'Now'], ['afternoon', 'This afternoon'], ['tonight', 'Tonight'], ['pick', 'Pick a time']]

export function GapPicker({ model, parts, picking, onToggle, onPick, fitText, onShowAll, band, children }: {
  model: GapsModel
  parts: readonly GapPart[]
  picking: boolean
  onToggle: (part: GapPart) => void
  onPick: () => void
  fitText: string | null
  onShowAll: () => void
  band?: { left: number; width: number; label: string } | null
  children?: React.ReactNode
}) {
  const lit = new Set(model.gaps.filter(g => g.parts.some(p => parts.includes(p))).map(g => g.id))
  return (
    <section className="sq-gaps" aria-labelledby="sq-discover-title">
      <div className="sq-gaps-head">
        <div>
          <h1 id="sq-discover-title">What fits your free time?</h1>
          <p>{model.gaps.length === 0 ? 'No free time left today' : 'Your free time today, from My Schedule'}</p>
        </div>
      </div>
      <div className="sq-tags" role="group" aria-label="Parts of the day">
        {PARTS.map(([k, label]) => {
          const on = k === 'pick' ? picking : parts.includes(k)
          return <button key={k} type="button" className="sq-tag" aria-pressed={on}
            onClick={() => k === 'pick' ? onPick() : onToggle(k)}><span>{label}</span></button>
        })}
      </div>
      {picking && <div className="sq-gaps-pick">{children}</div>}
      <div className="sq-ruler" aria-hidden="true">
        {model.gaps.map(g => <span key={'l' + g.id} className={'sq-ruler-label' + (lit.has(g.id) ? ' sq-lit' : '')} style={{ left: g.left + '%', width: g.width + '%' }}>{g.label}</span>)}
        <div className="sq-ruler-track">
          {model.busy.map((b, i) => <i key={i} className="sq-busy" style={{ left: b.left + '%', width: b.width + '%' }} />)}
          {model.gaps.map(g => <i key={g.id} className={'sq-gap' + (lit.has(g.id) ? ' sq-lit' : '')} style={{ left: g.left + '%', width: g.width + '%' }} />)}
          {picking && band && <i className="sq-gap sq-lit sq-picked" style={{ left: band.left + '%', width: band.width + '%' }} />}
        </div>
        {picking && band && <span className="sq-ruler-label sq-lit sq-picked-label" style={{ left: band.left + '%', width: band.width + '%' }}>{band.label}</span>}
        {model.ticks.map(t => <span key={t.label} className="sq-tick" style={{ left: t.left + '%' }}>{t.label}</span>)}
      </div>
      <p className="sq-gaps-note">
        {fitText ?? (picking ? 'Set a day and a start and end time. The list below updates as you go.' : 'Busy time comes from My Schedule. Pick parts of the day to see what fits.')}
        {fitText && !picking && <button type="button" className="sq-dab-link" onClick={onShowAll}>show everything</button>}
      </p>
    </section>
  )
}
