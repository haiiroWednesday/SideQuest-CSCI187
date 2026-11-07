// VIEW: show posted events using the same catalog-loading hook as Discover.
import type { EventCatalogPort } from '../controller/postEvent'
import { displayDate, displayTime } from '../controller/findEvents'
import { useCatalogEvents } from './useCatalogEvents'

export function PostedEventsList({ catalog, shared, revision }: {
  catalog: EventCatalogPort
  shared: boolean
  revision: number
}) {
  const posted = useCatalogEvents(catalog, true, revision)

  return (
    <section className="posted-events" aria-labelledby="posted-heading">
      <h3 id="posted-heading">Posted events <small>{shared ? 'shared catalog' : 'this browser only'}</small></h3>
      {posted.loading && posted.events.length === 0 ? <p className="library-empty">Loading posted events…</p>
        : posted.error ? <p className="error" role="alert">{posted.error}
            <button type="button" className="undo-button" onClick={() => { void posted.refresh() }}>Try again</button></p>
        : posted.events.length === 0 ? <p className="library-empty">No upcoming events posted yet.</p>
        : <ul className="saved-list">
            {posted.events.map(item => (
              <li key={item.id}>
                <div>
            <strong>{item.title}</strong>
            <span>Hosted by {item.hostName}</span>
            <span>{displayDate(item.date)} · {displayTime(item.start)}–{displayTime(item.end)} · {item.location}</span>
                </div>
              </li>
            ))}
          </ul>}
          </section>
  )
}
