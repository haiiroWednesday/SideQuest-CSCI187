// VIEW: the extras around fitting events on Discover. Tag chips, live "food now" notices,
// and the host's "leftover food" control.
// All decisions come from controller/presentAdvice.ts; this file only draws them.
import type { FoodNoticeModel } from '../controller/presentAdvice'
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


/** "Food left · 24 min" on the event's own ticket, for as long as the host's notice lasts. It used to be a
 *  block of its own above the list (kept in docs/removed/food-board). */
export function FoodLeftNote({ minutes }: { minutes: number | undefined }) {
  if (minutes === undefined) return null
  return <span className="sq-foodleft"><i className="sq-foodnow-dot" aria-hidden="true" />Food left · {minutes} min</span>
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
      {state !== 'available' && <small>{state === 'too-soon' ? 'Shared already. Try again in a few minutes.' : 'Showing on Discover for 30 minutes'}</small>}
    </div>
  )
}
