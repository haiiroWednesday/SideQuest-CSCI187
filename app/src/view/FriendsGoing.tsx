// VIEW (design review): "Ana + 2 friends" on event cards, with no way to stalk anyone.
// The rules live in controller/friendsGoing, the state and your saved choices in controller/groupsPreview,
// handed in by the design-review provider (DesignReview.tsx, loaded only in that build).
// This file only draws them and passes your taps back. Nothing here stores anything, least of all a place.
import { createContext, useContext } from 'react'
import type { GoingModel } from '../controller/friendsGoing'
import { personColor } from '../controller/groupPeople'
import './friends-going.css'

export type GoingApi = {
  going: (eventId: string) => GoingModel | null
  /** You chose to show your groups that you're going. Off until you turn it on. */
  sharing: (eventId: string) => boolean
  setSharing: (eventId: string, on: boolean) => void
}
export const GoingContext = createContext<GoingApi | null>(null)
export const useGoing = () => useContext(GoingContext)

/** Faces of friends going, then a count of everyone (only from 5). Nothing at all when neither applies. */
export function GoingFaces({ eventId, big = false }: { eventId: string; big?: boolean }) {
  const api = useGoing()
  const m = api?.going(eventId)
  if (!m) return null
  const faces = m.friends.slice(0, 3)
  return (
    <span className={`sq-going${big ? ' sq-going-big' : ''}`} data-testid="friends-going" aria-label={m.label} role="img">
      {faces.length > 0 && <span className="sq-going-faces" aria-hidden="true">
        {faces.map(n => <i key={n} style={{ background: personColor(n) }}>{n[0]}</i>)}
      </span>}
      {m.friendsText && <b aria-hidden="true">{m.friendsText}</b>}
      {/* A card has room for one line: friends first, else the count. The opened card shows both. */}
      {m.countText && (big || !m.friendsText) && <small aria-hidden="true">{m.countText}</small>}
    </span>
  )
}

/** On an opened card, who is going is a fact like the host and the place: its own row in the facts list,
 *  with a people icon in the same column (Cyn, Nov 25: "5 going ... looks unanchored and random"). */
export function GoingFact({ eventId }: { eventId: string }) {
  const api = useGoing()
  if (!api?.going(eventId)) return null
  return (
    <li className="sq-going-fact">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.8-4 3-6 6-6s5.2 2 6 6" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.2c2.6.2 4.1 2 4.6 5" /></svg>
      <GoingFaces eventId={eventId} big />
    </li>
  )
}

/** "Let my groups see I'm going", off by default, per event. */
export function ShareGoing({ eventId, planned }: { eventId: string; planned: boolean }) {
  const api = useGoing()
  if (!api) return null
  const on = api.sharing(eventId)
  return (
    <label className={`sq-share-going${on ? ' sq-on' : ''}`}>
      <input type="checkbox" checked={on} onChange={e => api.setSharing(eventId, e.target.checked)} />
      <span className="sq-share-box" aria-hidden="true">
        <svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" /></svg>
      </span>
      <span className="sq-share-text">
        <b>Let my groups see I'm going</b>
        {/* Short while off (the default). Once on, say exactly who sees what. */}
        {on && <small>{planned ? 'Your groups see your name. Never where you are.' : 'Your groups see your name once you plan it. Never where you are.'}</small>}
      </span>
    </label>
  )
}
