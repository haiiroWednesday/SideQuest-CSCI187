// VIEW: Post events and search the catalog for your available time.
import { useEffect, useRef, useState } from 'react'
import {
  findEvents, todayLocal, displayDate, displayTime,
  loadEventsChecked, persistEvents, removeEventWithReceipt, restoreRemovedEvent, isPastEvent,
  STORAGE_KEY, type CampusEvent, type RemovedEvent,
} from './controller/findEvents'
import { browserCatalogStorage, localEventCatalog, type ConnectedCatalog } from './controller/postEvent'
import { PostEventForm } from './view/PostEventForm'
import { useCatalogEvents } from './view/useCatalogEvents'

import { usePersonalSchedule, PlanButton, SchedulePage, ScheduleFeedback } from './view/PersonalSchedule'

// main.tsx passes the configured catalog (Supabase when app/.env.local is set).
// Without a prop, App uses the browser-only fallback, so tests never reach the network.
export default function App({ catalog }: { catalog?: ConnectedCatalog } = {}) {
  const [connection] = useState<ConnectedCatalog>(() => catalog ?? localEventCatalog(browserCatalogStorage))
  const posted = useCatalogEvents(connection.catalog)
  const [page, setPage] = useState(() => window.location.hash === '#schedule' ? 'schedule' : 'discover')
  useEffect(() => {
    const navigate = () => setPage(window.location.hash === '#schedule' ? 'schedule' : 'discover')
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  // Hydrate without writing: a malformed stored value must never be erased on mount.
  // Read the initial event list when React sets up this component. A failed
  // read must never automatically overwrite damaged browser storage.
  const [initial] = useState(() => {
    try { return loadEventsChecked(window.localStorage) }
    catch { return { events: [] as CampusEvent[], blocked: true } }
  })
  // In React, events holds the current list; setEvents asks React to
  // update the list on screen. Other state variables track the form and alerts.
  const [legacyEvents, setLegacyEvents] = useState<CampusEvent[]>(initial.events)
  const savedEventsRef = useRef<CampusEvent[]>(initial.events)
  const hasUnsavedRef = useRef(false)
  const [, refreshPastLabels] = useState(0)
  const [storageBlocked, setStorageBlocked] = useState(initial.blocked)
  const [lastRemoved, setLastRemoved] = useState<RemovedEvent | null>(null)
  const plans = usePersonalSchedule(connection.catalog, posted.events, posted.revision, page === 'schedule')
  // Errors from the M1 list's Remove/Undo actions. Posting errors live in PostEventForm.
  const [createError, setCreateError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const [freeDate, setFreeDate] = useState(todayLocal)
  const [freeStart, setFreeStart] = useState('14:00')
  const [freeEnd, setFreeEnd] = useState('16:00')

  // Past-event labels should update even when someone leaves SideQuest open.
  useEffect(() => {
    const timer = window.setInterval(() => refreshPastLabels(value => value + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  // Sync updates from other browser tabs without writing the same list back.
  useEffect(() => {
    // The browser notifies other tabs when storage changes. We read the
    // latest data here without writing it back and causing another update.
    const onStorage = (event: StorageEvent) => {
      // 🪟 Ignore changes from other storage areas/keys. A null key can
      // mean the other tab cleared storage, which also needs a refresh.
      if (event.storageArea !== window.localStorage || (event.key !== null && event.key !== STORAGE_KEY)) return
      let current: { events: CampusEvent[]; blocked: boolean }
      try { current = loadEventsChecked(window.localStorage) }
      catch { current = { events: [], blocked: true } }
      if (hasUnsavedRef.current) {
        setCreateError('Another tab changed saved events while this tab has unsaved changes. Review or reload before making more changes.')
        setNotice(null)
        return
      }
      savedEventsRef.current = current.events
      setLegacyEvents(current.events)
      setStorageBlocked(current.blocked)
      setStorageWarning(false)
      setLastRemoved(null)
      setNotice('Your event list was updated in another tab.')
    }
    window.addEventListener('storage', onStorage)
    // 🧹 React runs this cleanup when the component unmounts, preventing
    // duplicate listeners from accumulating as the page changes.
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Save can succeed, fail to persist, or be blocked because another tab
  // changed the list. Compare saved data before writing to avoid stale edits.
  function store(next: CampusEvent[]): 'saved' | 'unsaved' | 'conflict' {
    let saved = false
    try {
      if (!storageBlocked) {
        const latest = loadEventsChecked(window.localStorage)
        // A second tab may change the list before the storage event arrives.
        // Refuse stale writes rather than overwrite the other tab's events.
        // 🔐 JSON.stringify compares the list's CONTENT rather than array
        // identity (two different arrays can hold the same event data).
        // This is a best-effort check, not an atomic database transaction.
        if (latest.blocked || JSON.stringify(latest.events) !== JSON.stringify(savedEventsRef.current)) {
          savedEventsRef.current = latest.events
          hasUnsavedRef.current = false
          setLegacyEvents(latest.events)
          setStorageBlocked(latest.blocked)
          setStorageWarning(false)
          setLastRemoved(null)
          setCreateError('Your events changed in another tab. Please review the updated list and try again.')
          setNotice(null)
          return 'conflict'
        }
        saved = persistEvents(window.localStorage, next)
      }
    } catch { /* browser storage may be disabled */ }
    if (saved) savedEventsRef.current = next
    hasUnsavedRef.current = !saved
    setLegacyEvents(next)
    setStorageWarning(!saved)
    // The ternary (? :) is a short if/else. Unsaved changes may appear
    // on screen but disappear after the next page reload.
    return saved ? 'saved' : 'unsaved'
  }

  // Recovery can discard invalid entries. The confirmation protects
  // the user's original saved data from being overwritten silently.
  function recoverSavedEvents() {
    if (!window.confirm('Replace unreadable saved data with the valid events currently shown? Any corrupt entries will be discarded.')) return
    let saved = false
    try { saved = persistEvents(window.localStorage, legacyEvents) }
    catch { /* browser storage may be disabled */ }
    if (saved) savedEventsRef.current = legacyEvents
    hasUnsavedRef.current = !saved
    setStorageBlocked(!saved)
    setStorageWarning(!saved)
    setNotice(saved ? 'Saved event data recovered.' : null)
  }

  // The matching list is calculated from current inputs on every render;
  // changing the search date or times updates results automatically.
  // Object destructuring pulls out matches and renames error to searchError
  // so it is easy to distinguish search errors from event-creation errors.
  const { matches, error: searchError } = findEvents(posted.events, freeDate, freeStart, freeEnd)

  // The returned removal receipt allows Undo to restore the event later.
  // A failed save during deletion still needs clearer confirmation messaging.
  function removeEvent(id: string) {
    if (storageBlocked) {
      setCreateError('Recover saved data before removing an event.')
      return
    }
    const result = removeEventWithReceipt(legacyEvents, id)
    if (!result.removed) return
    const outcome = store(result.events)
    if (outcome === 'conflict') return
    setLastRemoved(result.removed)
    setCreateError(null)
    setNotice(outcome === 'saved' ? 'Event removed.' : 'Event removed temporarily, but your browser could not save the deletion. It may return after reloading.')
  }

  function undoRemove() {
    if (!lastRemoved || storageBlocked) return
    const outcome = store(restoreRemovedEvent(legacyEvents, lastRemoved))
    if (outcome === 'conflict') return
    setLastRemoved(null)
    setNotice(outcome === 'saved' ? 'Event restored.' : 'Event restored temporarily, but your browser could not save it. It may disappear after reloading.')
  }

  // JSX below describes the visible page. React updates it when state
  // changes, and every event ID serves as a stable key for its event card.
  return (
    <main className="shell">
      <header className="topbar">
        <div className="wordmark"><span className="flower">✳</span> sidequest<span className="dot">.</span></div>
        <span className="tag">SCU · Events &amp; personal plans</span>
      </header>
      <nav className="page-nav" aria-label="Main navigation">
        <a href="#discover" aria-current={page === 'discover' ? 'page' : undefined}>Find events</a>
        <a href="#schedule" aria-current={page === 'schedule' ? 'page' : undefined}>My Schedule</a>
      </nav>
      {page === 'schedule' ? <SchedulePage plans={plans} /> : <>
      <section className="hero">
        <div className="eyebrow">YOUR FREE TIME, WELL SPENT</div>
        <h1>There's more to campus <em>than class.</em></h1>
        <p className="lead">Create an event, then discover what fits your free time.</p>
      </section>

      <section className="workspace" aria-label="Create and find events">
        <section className="panel" aria-labelledby="create-heading">
          <div className="panel-heading">
            <h2 id="create-heading">Post an event</h2>
            <span>Step 1</span>
          </div>
          <p className="panel-description">Post a campus event. Events today must start at or after the current time.</p>
          <PostEventForm connection={connection} catalogEvents={posted}
            renderEventActions={event => <PlanButton event={event} plans={plans} />} />
          {createError && <p className="error" role="alert">{createError}</p>}
          {notice && <div className="success" role="status">{notice}</div>}
          {lastRemoved && <div className="undo-control">
            <button type="button" className="undo-button" onClick={undoRemove}>Undo removal</button>
          </div>}
          {storageBlocked && <div className="storage-alert" role="alert">
            Some saved browser data could not be read. It has not been overwritten.
            <button type="button" className="recovery-button" onClick={recoverSavedEvents}>
              Recover valid events
            </button>
          </div>}
          {!storageBlocked && storageWarning && <p className="error" role="alert">Browser storage could not save your changes. They may disappear after reload.</p>}
        </section>

        <section className="panel" aria-labelledby="search-heading">
          <div className="panel-heading">
            <h2 id="search-heading">When are you free?</h2>
            <span>Step 2</span>
          </div>
          <p className="panel-description">Find upcoming events that fit your whole free-time window.</p>
          <div className="search-fields">
            <label>
              <span>DATE</span>
              <input aria-label="Free on date" type="date" value={freeDate} onChange={(e) => setFreeDate(e.target.value)} />
            </label>
            <div className="time-row">
              <label>
                <span>FROM</span>
                <input aria-label="Free from" type="time" value={freeStart} onChange={(e) => setFreeStart(e.target.value)} />
              </label>
              <label>
                <span>UNTIL</span>
                <input aria-label="Free until" type="time" value={freeEnd} onChange={(e) => setFreeEnd(e.target.value)} />
              </label>
            </div>
          </div>
          {searchError && <p className="error" role="alert">{searchError}</p>}
          <div className="mini-summary"><strong>{matches.length}</strong> matching {matches.length === 1 ? 'event' : 'events'}</div>
        </section>
      </section>

      {/* 📢 aria-live="polite" lets screen readers announce search updates
          without interrupting what the person is already doing. */}
      <ScheduleFeedback plans={plans} />
      <section className="results" aria-live="polite">
        <div className="section-title">
          <h2>Made for your window</h2>
          <span className="counter">{matches.length} {matches.length === 1 ? 'event' : 'events'}</span>
        </div>
        {/* 🔎 Three display cases: invalid search, zero matches, or a list
            of event cards. The ? : operator chooses between them. */}
        {posted.error ? (
          <div className="empty">Matching events are unavailable. Retry loading the posted events above.</div>
        ) : posted.loading && posted.events.length === 0 ? (
          <div className="empty">Loading events to match…</div>
        ) : searchError ? (
          <div className="empty">Correct your available date or time to see matching events.</div>
        ) : matches.length === 0 ? (
          <div className="empty">{posted.events.length === 0
            ? 'No upcoming events to match. Post an event above!'
            : 'No upcoming events fit this date and time. Try a different window.'}</div>
        ) : (
          <div className="events">
            {/* .map makes one card for every match; key={event.id} helps
                React keep the correct card when the list changes. */}
            {matches.map((event) => (
              <article className="event-card" key={event.id}>
                <div className="event-left">
                  <span className="category">Campus event</span>
                  <h3>{event.title}</h3><p>{event.location}</p>
                  {event.description && <p className="event-description">{event.description}</p>}
                </div>
                <div className="event-right">
                  <span className="fit">✓ Fits</span>
                  <strong>{displayDate(event.date)}</strong>
                  <strong>{displayTime(event.start)} – {displayTime(event.end)}</strong>
                  <PlanButton event={event} plans={plans} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Keep earlier local events accessible without publishing them or
          including them in results from the new catalog. */}
      <section className="library" aria-labelledby="saved-heading">
        <div className="section-title"><h2 id="saved-heading">Legacy browser events</h2><span className="counter">{legacyEvents.length} total</span></div>
        {legacyEvents.length === 0
          ? <p className="library-empty">No legacy events saved in this browser.</p>
          : <ul className="saved-list">
              {legacyEvents.map((event) => (
                <li key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    {isPastEvent(event) && <small className="past-tag">Past event</small>}
                    <span>{displayDate(event.date)} · {displayTime(event.start)}–{displayTime(event.end)} · {event.location}</span>
                    {event.description && <span className="event-description">{event.description}</span>}
                  </div>
                  <div className="event-actions">
                    <button type="button" className="remove-button" onClick={() => removeEvent(event.id)}
                      aria-label={`Remove ${event.title}`}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>}
      </section>
      </>}
      <footer>{connection.shared ? 'Posted events are shared.' : 'Posted events are stored in this browser.'} Personal plans stay on this device.</footer>
    </main>
  )
}
