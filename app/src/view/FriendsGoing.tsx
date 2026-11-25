// VIEW (design review): "Ana + 2 friends" on event cards, with no way to stalk anyone.
// The rules and your saved "Show my friends I'm going" choices live in the controller (friendsGoing).
// This file only draws them and passes your taps back. Nothing here stores anything, least of all a place.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { friendsGoing, readGoingShares, sampleGoingTotal, setGoingShare, type GoingModel } from '../controller/friendsGoing'
import { DEMO_YOU, demoFriendData, personColor } from './FriendsPreview'
import './friends-going.css'

type GoingApi = {
  going: (eventId: string) => GoingModel | null
  /** You chose to show your groups that you're going. Off until you turn it on. */
  sharing: (eventId: string) => boolean
  setSharing: (eventId: string, on: boolean) => void
}
const GoingContext = createContext<GoingApi | null>(null)
export const useGoing = () => useContext(GoingContext)

export function FriendsGoingProvider({ events, enabled, children }: { events: readonly { id: string }[]; enabled: boolean; children: ReactNode }) {
  const [mine, setMine] = useState<string[]>(() => readGoingShares())
  const data = useMemo(() => enabled ? demoFriendData(events) : null, [events, enabled])
  const going = useCallback((eventId: string) => data
    ? friendsGoing({ eventId, you: DEMO_YOU, groups: data.groups, shares: data.shares, total: sampleGoingTotal(eventId) })
    : null, [data])
  const setSharing = useCallback((eventId: string, on: boolean) => setMine(setGoingShare(eventId, on)), [])
  const api = useMemo<GoingApi | null>(() => enabled ? { going, sharing: id => mine.includes(id), setSharing } : null, [enabled, going, mine, setSharing])
  return <GoingContext.Provider value={api}>{children}</GoingContext.Provider>
}

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

/** "Show my friends I'm going", off by default, per event. */
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
        <b>Show my friends I'm going</b>
        {/* Short while off (the default). Once on, say exactly who sees what. */}
        {on && <small>{planned ? 'Your groups see your name. Never where you are.' : 'Your groups see your name once you plan it. Never where you are.'}</small>}
      </span>
    </label>
  )
}
