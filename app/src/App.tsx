// VIEW: Create events and search your available time. Rules live in controller/model.
import { useEffect, useState, type FormEvent } from 'react'
import {
  createEvent, findEvents, todayLocal, displayDate, displayTime,
  loadEvents, persistEvents, removeEvent, type CampusEvent, type EventDraft,
} from './controller/findEvents'

export default function App() {
  const [events, setEvents] = useState<CampusEvent[]>(() => {
    try { return loadEvents(window.localStorage) } catch { return [] }
  })
  const [draft, setDraft] = useState<EventDraft>(() => ({
    title: '', description: '', location: '', date: todayLocal(), start: '14:30', end: '15:30',
  }))
  const [createError, setCreateError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const [freeDate, setFreeDate] = useState(todayLocal)
  const [freeStart, setFreeStart] = useState('14:00')
  const [freeEnd, setFreeEnd] = useState('16:00')

  useEffect(() => {
    let saved = false
    try { saved = persistEvents(window.localStorage, events) } catch { /* storage denied */ }
    setStorageWarning(!saved)
  }, [events])

  const { matches, error: searchError } = findEvents(events, freeDate, freeStart, freeEnd)
  const updateDraft = (field: keyof EventDraft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }))

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = createEvent(events, draft, crypto.randomUUID())
    if (result.error) {
      setCreateError(result.error)
      setNotice(null)
      return
    }
    setEvents(result.events)
    setCreateError(null)
    setNotice(`Created “${draft.title.trim()}”! It now appears in your event list.`)
    setFreeDate(draft.date)
    setDraft((current) => ({ ...current, title: '', description: '', location: '' }))
  }

  function removeEvent(id: string) {
    setEvents((current) => removeEvent(current, id))
    setCreateError(null)
    setNotice('Event removed.')
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="wordmark"><span className="flower">✳</span> sidequest<span className="dot">.</span></div>
        <span className="tag">SCU · M1 walking skeleton</span>
      </header>
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
          <p className="panel-description">Add a campus event yourself.</p>
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
          {notice && <p className="success" role="status">{notice}</p>}
          {storageWarning && <p className="error" role="alert">Browser storage is unavailable. Your events may disappear when you reload.</p>}
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

      <section className="results" aria-live="polite">
        <div className="section-title">
          <h2>Made for your window</h2>
          <span className="counter">{matches.length} {matches.length === 1 ? 'event' : 'events'}</span>
        </div>
        {searchError ? (
          <div className="empty">Correct your available date or time to see matching events.</div>
        ) : matches.length === 0 ? (
          <div className="empty">{events.length === 0
            ? 'No events yet. Create your first event above!'
            : 'No created events fit this date and time. Try a different window.'}</div>
        ) : (
          <div className="events">
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="library" aria-labelledby="saved-heading">
        <div className="section-title"><h2 id="saved-heading">Your created events</h2><span className="counter">{events.length} total</span></div>
        {events.length === 0
          ? <p className="library-empty">Events you create will show up here.</p>
          : <ul className="saved-list">
              {events.map((event) => (
                <li key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    <span>{displayDate(event.date)} · {displayTime(event.start)}–{displayTime(event.end)} · {event.location}</span>
                    {event.description && <span className="event-description">{event.description}</span>}
                  </div>
                  <button type="button" className="remove-button" onClick={() => removeEvent(event.id)}
                    aria-label={`Remove ${event.title}`}>Remove</button>
                </li>
              ))}
            </ul>}
      </section>
      <footer>M1 prototype · Events are saved only in this browser, not shared across devices.</footer>
    </main>
  )
}
