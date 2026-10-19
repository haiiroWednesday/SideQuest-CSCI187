// VIEW: The student's screen. Matching happens in the controller/model.
import { useState } from 'react'
import { findEvents } from './controller/findEvents'

export default function App() {
  const [start, setStart] = useState('14:00')
  const [end, setEnd] = useState('16:00')
  const { matches, error } = findEvents(start, end)

  return (
    <main className="shell">
      <header className="topbar">
        <div className="wordmark"><span className="flower">✳</span> sidequest<span className="dot">.</span></div>
        <span className="tag">SCU · M1 prototype</span>
      </header>
      <section className="hero">
        <div className="eyebrow">YOUR FREE TIME, WELL SPENT</div>
        <h1>There's more to campus <em>than class.</em></h1>
        <p className="lead">Find little adventures that fit between everything else.</p>
      </section>
      <section className="search-panel" aria-labelledby="search-heading">
        <div className="panel-heading">
          <h2 id="search-heading">When are you free?</h2><span>Today · Sample events</span>
        </div>
        <div className="fields">
          <label><span>FROM</span>
            <input aria-label="Free from" type="time" value={start}
              onChange={(event) => setStart(event.target.value)} />
          </label>
          <span className="arrow" aria-hidden="true">→</span>
          <label><span>UNTIL</span>
            <input aria-label="Free until" type="time" value={end}
              onChange={(event) => setEnd(event.target.value)} />
          </label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
      <section className="results" aria-live="polite">
        <div className="section-title">
          <h2>Made for your window</h2>
          <span className="counter">{matches.length} {matches.length === 1 ? 'event' : 'events'}</span>
        </div>
        {matches.length === 0 ? (
          <div className="empty">No events fit that window. Try different times.</div>
        ) : (
          <div className="events">
            {matches.map((event) => (
              <article className="event-card" key={event.id}>
                <div className="event-left">
                  <span className="category">{event.category}</span>
                  <h3>{event.title}</h3><p>{event.location}</p>
                </div>
                <div className="event-right">
                  <span className="fit">✓ Fits</span>
                  <strong>{event.start} – {event.end}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer>Fictional campus events for M1. Same-day, full-attendance matching only.</footer>
    </main>
  )
}
