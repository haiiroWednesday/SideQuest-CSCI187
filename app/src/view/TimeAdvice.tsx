// VIEW: the extras around fitting events on Discover. Tag chips, live "food now" notices,
// one pick and a short plan per free stretch, and the host's "leftover food" control.
// All decisions come from controller/presentAdvice.ts; this file only draws them.
import type { StretchAdvice, FoodNoticeModel } from '../controller/presentAdvice'
import type { TagFiltersModel } from '../controller/screenModels'
import { LEAVE_NOTE_LABEL } from '../controller/presentAdvice'
import './foodtime.css'

export function TagFilters({ model, onChange }: { model: TagFiltersModel; onChange: (tags: string[]) => void }) {
  return (
    <div className="sq-tagfilters" role="group" aria-label="Only show events with">
      <span className="sq-tagfilters-name" aria-hidden="true">Only</span>
      {model.options.map(tag => {
        const on = model.selected.includes(tag.id)
        return (
          <button key={tag.id} type="button" className={`sq-tagchip${on ? ' sq-on' : ''}`} aria-pressed={on}
            disabled={!on && tag.count === 0}
            onClick={() => onChange(on ? model.selected.filter(id => id !== tag.id) : [...model.selected, tag.id])}>
            {on && <i className="sq-tagchip-tick" aria-hidden="true">✓</i>}<span>{tag.label}</span><b aria-label={`${tag.count} events`}>{tag.count}</b>
          </button>
        )
      })}
    </div>
  )
}

/** Live notices from hosts: food left at an event happening now. Shown on the page, never pushed. */
export function FoodNowBoard({ notices, onOpen }: { notices: readonly FoodNoticeModel[]; onOpen: (id: string) => void }) {
  if (!notices.length) return null
  return (
    <section className="sq-foodnow" aria-labelledby="sq-foodnow-h">
      <h2 id="sq-foodnow-h"><i className="sq-foodnow-dot" aria-hidden="true" />Food left, come now</h2>
      <ul>
        {notices.map(n => (
          <li key={n.eventId}>
            <button type="button" className="sq-foodnow-item" onClick={() => onOpen(n.eventId)}>
              <strong>{n.title}</strong>
              <span>{n.location}</span>
              <small>{n.minutesLeft} min left</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** One pick per free stretch, and when two or more chain, a plan for the whole stretch. */
export function StretchAdviceList({ items, onOpen, onPlanAll, blocked }: {
  items: readonly StretchAdvice[]
  onOpen: (id: string) => void
  onPlanAll: (ids: string[]) => void
  blocked?: boolean
}) {
  if (!items.length) return null
  return (
    <section className="sq-onepicks" aria-labelledby="sq-onepicks-h">
      <h2 id="sq-onepicks-h" className="sq-visually-hidden">One pick for each free stretch</h2>
      {items.map(item => (
        <article key={item.id} className="sq-onepick" aria-label={`Free ${item.label}`}>
          <p className="sq-onepick-when"><b>Free</b> {item.label}</p>
          <button type="button" className="sq-onepick-main" onClick={() => onOpen(item.pick.id)}>
            <span className="sq-onepick-label">Our pick</span>
            <strong>{item.pick.title}</strong>
            <span className="sq-onepick-facts">{item.pick.time}, {item.pick.location}</span>
            <span className="sq-onepick-why">{item.pick.reason}</span>
          </button>
          {item.count > 1 && <p className="sq-onepick-more">{item.count - 1} more {item.count === 2 ? 'fits' : 'fit'} this time, below.</p>}
          {item.plan && (
            <div className="sq-onepick-plan">
              <p className="sq-onepick-plan-h">Or fill it</p>
              <ol>
                {item.plan.stops.map(stop => (
                  <li key={stop.id}>
                    {stop.walk && <span className="sq-onepick-walk">{stop.walk}</span>}
                    <span className="sq-onepick-stop"><b>{stop.time}</b> {stop.title}</span>
                  </li>
                ))}
              </ol>
              <button type="button" className="sq-plan-button sq-onepick-planall" disabled={blocked} onClick={() => onPlanAll(item.plan!.ids)}>
                Plan all {item.plan.ids.length}
              </button>
              <small className="sq-onepick-est">{LEAVE_NOTE_LABEL}</small>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}

/** "Leave by 1:42pm for Chem lab" on a fitting card. A warning when the walk makes you late. */
export function LeaveNote({ note }: { note: { text: string; warn: boolean } | undefined }) {
  if (!note) return null
  return (
    <span className={`sq-leave${note.warn ? ' sq-leave-warn' : ''}`} title={LEAVE_NOTE_LABEL}>
      {note.text}<span className="sq-visually-hidden">. {LEAVE_NOTE_LABEL}</span>
    </span>
  )
}

/** Tags on a card, with who set them. Never guessed from the title. */
export function StubTags({ labels, source }: { labels?: readonly string[]; source?: string }) {
  if (!labels?.length) return null
  return (
    <span className="sq-stub-tags">
      {labels.map(label => <span key={label} className="sq-stub-tag">{label}</span>)}
      {source && <span className="sq-stub-tagsrc">{source}</span>}
    </span>
  )
}

/** The host's control on their own live event. */
export function FoodNowControl({ state, onShare }: { state: 'available' | 'shared' | 'too-soon'; onShare: () => void }) {
  return (
    <div className="sq-foodctl">
      <button type="button" className="sq-handoff sq-foodctl-btn" disabled={state !== 'available'} onClick={onShare}>
        {state === 'available' ? 'Share leftover food' : 'Food shared'}
      </button>
      {/* Said once it is shared, so the live card stays short before that. */}
      {state !== 'available' && <small>{state === 'too-soon' ? 'Shared already. Try again in a few minutes.' : 'On Discover for 30 minutes. No alerts sent.'}</small>}
    </div>
  )
}
