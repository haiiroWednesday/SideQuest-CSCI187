import { useEffect, useState } from 'react'
import { displayDate, displayTime } from '../controller/findEvents'
import { loadEventDetails, loadUpcomingEvents, type EventCatalogPort, type CatalogEvent } from '../controller/browseEvents'

type Props = {
  catalog?: EventCatalogPort
}

export default function EventBrowser({ catalog }: Props) {
  const [events, setEvents] = useState<CatalogEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<CatalogEvent | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [missingDetail, setMissingDetail] = useState(false)

  useEffect(() => {
    let active = true
    setEvents(null)
    setLoading(true)
    setLoadError(null)
    if (!catalog) {
      setLoading(false)
      setLoadError('The shared event catalog is not connected yet.')
      return () => { active = false }
    }

    loadUpcomingEvents(catalog).then((upcoming) => {
      if (active) setEvents(upcoming)
    }).catch(() => {
      if (active) setLoadError('Could not load upcoming events.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [catalog, reload])

  useEffect(() => {
    let active = true
    setDetail(null)
    setDetailError(null)
    setMissingDetail(false)
    if (!catalog || selectedId === null) {
      setDetailLoading(false)
      return () => { active = false }
    }

    setDetailLoading(true)
    loadEventDetails(catalog, selectedId).then((event) => {
      if (!active) return
      if (event) setDetail(event)
      else setMissingDetail(true)
    }).catch(() => {
      if (active) setDetailError('Could not load this event. Please try again.')
    }).finally(() => {
      if (active) setDetailLoading(false)
    })
    return () => { active = false }
  }, [catalog, selectedId])

  return (
    <section className="library" aria-labelledby="browse-heading">
      <div className="section-title">
        <h2 id="browse-heading">Browse campus events</h2>
        <span className="counter">{events?.length ?? 0} upcoming</span>
      </div>
      {loading ? (
        <p role="status" className="library-empty">Loading upcoming events…</p>
      ) : loadError ? (
        catalog ? (
          <div className="empty" role="alert">
            {loadError}
            <button type="button" className="remove-button" onClick={() => setReload(value => value + 1)}>Retry</button>
          </div>
        ) : <p className="library-empty">{loadError}</p>
      ) : events?.length === 0 ? (
        <p className="empty">There are no upcoming events.</p>
      ) : (
        <ul className="saved-list" aria-label="Upcoming events">
          {events?.map((event) => (
            <li key={event.id} className="browse-event-item">
              <div className="browse-event-summary">
                <div>
                <strong>{event.title}</strong>
                <span>{event.hostName} · {displayDate(event.date)} · {displayTime(event.start)}–{displayTime(event.end)} · {event.location}</span>
                </div>
                <button
                  type="button"
                  className="remove-button"
                  aria-label={`View details for ${event.title} (${event.id})`}
                  aria-expanded={selectedId === event.id}
                  onClick={() => setSelectedId(current => current === event.id ? null : event.id)}
                >
                  {selectedId === event.id ? 'Hide details' : 'Details'}
                </button>
              </div>
              {selectedId === event.id && (
                <section className="browse-event-details" aria-label={`Details for ${event.title}`} aria-live="polite">
                  {detailLoading ? (
                    <p role="status">Loading event details…</p>
                  ) : detailError ? (
                    <p role="alert" className="error">{detailError}</p>
                  ) : missingDetail ? (
                    <p className="empty">This event is no longer available.</p>
                  ) : detail ? (
                    <div className="event-left">
                      <h3>{detail.title}</h3>
                      <p><strong>Host:</strong> {detail.hostName}</p>
                      <p className="event-description">{detail.description}</p>
                      <p><strong>Location:</strong> {detail.location}</p>
                      <p><strong>Date:</strong> {displayDate(detail.date)}</p>
                      <p><strong>Time:</strong> {displayTime(detail.start)}–{displayTime(detail.end)}</p>
                    </div>
                  ) : null}
                </section>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
