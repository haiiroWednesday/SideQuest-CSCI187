// VIEW: Create events and search your available time. Rules and persistence are mediated through the Controller.
import { useEffect, useState, type FormEvent } from 'react'
import {
  createEvent, findEvents, todayLocal, initialEventWindow, displayDate, displayTime,
  loadEventsChecked, persistEvents, removeEventWithReceipt, restoreRemovedEvent, isPastEvent,
  type CampusEvent, type EventDraft, type RemovedEvent,
} from './controller/findEvents'

import { usePersonalSchedule, PlanButton, SchedulePage, ScheduleFeedback } from './view/PersonalSchedule'

export default function App() {
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
  const [events, setEvents] = useState<CampusEvent[]>(initial.events)
  const plans = usePersonalSchedule(events)
  const [storageBlocked, setStorageBlocked] = useState(initial.blocked)
  const [lastRemoved, setLastRemoved] = useState<RemovedEvent | null>(null)
  // draft is what the user is still typing. It becomes an event only
  // after Controller and Model validation and the assignment of an ID.
  const [draft, setDraft] = useState<EventDraft>(() => ({
    title: '', description: '', location: '', ...initialEventWindow(),
  }))
  const [createError, setCreateError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const [freeDate, setFreeDate] = useState(todayLocal)
  const [freeStart, setFreeStart] = useState('14:00')
  const [freeEnd, setFreeEnd] = useState('16:00')

  // Sync updates from other browser tabs without writing the same list back.
  useEffect(() => {
    // The browser notifies other tabs when storage changes. We read the
    // latest data here without writing it back and causing another update.
    const onStorage = (event: StorageEvent) => {
      // 🪟 Ignore changes from other storage areas/keys. A null key can
      // mean the other tab cleared storage, which also needs a refresh.
      if (event.storageArea !== window.localStorage || (event.key !== null && event.key !== 'sidequest.created-events.v1')) return
      let current: { events: CampusEvent[]; blocked: boolean }
      try { current = loadEventsChecked(window.localStorage) }
      catch { current = { events: [], blocked: true } }
      setEvents(current.events)
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
        if (latest.blocked || JSON.stringify(latest.events) !== JSON.stringify(events)) {
          setEvents(latest.events)
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
    setEvents(next)
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
    try { saved = persistEvents(window.localStorage, events) }
    catch { /* browser storage may be disabled */ }
    setStorageBlocked(!saved)
    setStorageWarning(!saved)
    setNotice(saved ? 'Saved event data recovered.' : null)
  }

  // The matching list is calculated from current inputs on every render;
  // changing the search date or times updates results automatically.
  // Object destructuring pulls out matches and renames error to searchError
  // so it is easy to distinguish search errors from event-creation errors.
  const { matches, error: searchError } = findEvents(events, freeDate, freeStart, freeEnd)
  // keyof limits field names to properties of EventDraft, and the object
  // spread keeps other form values while updating only one field.
  const updateDraft = (field: keyof EventDraft, value: string) =>
    // [field] means "use the field-name VARIABLE as this object's key".
    // For example, updateDraft('title', 'Choir') changes draft.title only.
    setDraft((current) => ({ ...current, [field]: value }))

  // On form submit, ask the Controller to create a valid event. Only then
  // attempt storage and show the user the appropriate result.
  function handleCreate(event: FormEvent<HTMLFormElement>) {
    // Submitting an HTML form normally reloads/navigates the browser.
    // React handles this form locally, so we prevent that default action.
    event.preventDefault()
    if (storageBlocked) {
      setCreateError('Saved data needs recovery before changes can be made.')
      return
    }
    // 🔑 IDs distinguish two events even if their titles are identical.
    // The Controller checks that the generated ID is not already used.
    const result = createEvent(events, draft, crypto.randomUUID())
    if (result.error) {
      setCreateError(result.error)
      setNotice(null)
      return
    }
    const outcome = store(result.events)
    if (outcome === 'conflict') return
    setLastRemoved(null)
    setCreateError(null)
    setNotice(outcome === 'saved'
      ? `Created “${draft.title.trim()}”! It now appears in your event list.`
      : 'Event added temporarily, but your browser could not save it. It may disappear after reloading.')
    setFreeDate(draft.date)
    // Clear the typed description/title/location after posting, but keep
    // the chosen date and times to make posting another event easier.
    setDraft((current) => ({ ...current, title: '', description: '', location: '' }))
  }

  // The returned removal receipt allows Undo to restore the event later.
  // A failed save during deletion still needs clearer confirmation messaging.
  function removeEvent(id: string) {
    if (storageBlocked) {
      setCreateError('Recover saved data before removing an event.')
      return
    }
    const result = removeEventWithReceipt(events, id)
    if (!result.removed) return
    if (store(result.events) === 'conflict') return
    setLastRemoved(result.removed)
    setCreateError(null)
    setNotice('Event removed.')
  }

  function undoRemove() {
    if (!lastRemoved || storageBlocked) return
    if (store(restoreRemovedEvent(events, lastRemoved)) === 'conflict') return
    setLastRemoved(null)
    setNotice('Event restored.')
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
            <h2 id="create-heading">Create an event</h2>
            <span>Step 1</span>
          </div>
          <p className="panel-description">Add a campus event yourself. Events today must start at or after the current time.</p>
          {/* 📝 Controlled inputs: React state supplies the value; onChange
              records what the user types. See draft/title below. */}
          <form className="event-form" onSubmit={handleCreate}>
            <label>
              <span>EVENT NAME</span>
              <input type="text" value={draft.title} required maxLength={100}
                placeholder="e.g. Art Workshop" onChange={(e) => updateDraft('title', e.target.value)} />
            </label>
            <label>
              <span>DESCRIPTION (OPTIONAL)</span>
              <textarea value={draft.description ?? ''} maxLength={500} rows={3}
                placeholder="What makes this event special?"
                onChange={(e) => updateDraft('description', e.target.value)} />
            </label>
            <label>
              <span>LOCATION</span>
              <input type="text" value={draft.location} required maxLength={100}
                placeholder="e.g. Student Center" onChange={(e) => updateDraft('location', e.target.value)} />
            </label>
            <label>
              <span>DATE</span>
              <input type="date" value={draft.date} min={todayLocal()} required onChange={(e) => updateDraft('date', e.target.value)} />
            </label>
            <div className="time-row">
              <label>
                <span>START</span>
                <input type="time" value={draft.start} required onChange={(e) => updateDraft('start', e.target.value)} />
              </label>
              <label>
                <span>END</span>
                <input type="time" value={draft.end} required onChange={(e) => updateDraft('end', e.target.value)} />
              </label>
            </div>
            <button className="primary-button" type="submit">+ Create event</button>
          </form>
          {createError && <p className="error" role="alert">{createError}</p>}
          {notice && <div className="success" role="status">{notice}
            {lastRemoved && <button type="button" className="undo-button" onClick={undoRemove}>Undo removal</button>}
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
          <p className="panel-description">Find events you created that fit your whole free-time window.</p>
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
        {searchError ? (
          <div className="empty">Correct your available date or time to see matching events.</div>
        ) : matches.length === 0 ? (
          <div className="empty">{events.length === 0
            ? 'No events yet. Create your first event above!'
            : 'No created events fit this date and time. Try a different window.'}</div>
        ) : (
          <div className="events">
            {/* .map makes one card for every match; key={event.id} helps
                React keep the correct card when the list changes. */}
            {matches.map((event) => (
              <article className="event-card" key={event.id}>
                <div className="event-left">
                  <span className="category">Your event</span>
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

      {/* 📚 This library shows ALL created events, even when the search
          above shows only the events that fit the current time window. */}
      <section className="library" aria-labelledby="saved-heading">
        <div className="section-title"><h2 id="saved-heading">Your created events</h2><span className="counter">{events.length} total</span></div>
        {events.length === 0
          ? <p className="library-empty">Events you create will show up here.</p>
          : <ul className="saved-list">
              {events.map((event) => (
                <li key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    {isPastEvent(event) && <small className="past-tag">Past event</small>}
                    <span>{displayDate(event.date)} · {displayTime(event.start)}–{displayTime(event.end)} · {event.location}</span>
                    {event.description && <span className="event-description">{event.description}</span>}
                  </div>
                  <div className="event-actions">
                    <PlanButton event={event} plans={plans} />
                    <button type="button" className="remove-button" onClick={() => removeEvent(event.id)}
                      aria-label={`Remove ${event.title}`}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>}
      </section>
      </>}
      <footer>Prototype · Events and personal plans are saved only in this browser. Shared catalog integration is pending.</footer>
    </main>
  )
}
