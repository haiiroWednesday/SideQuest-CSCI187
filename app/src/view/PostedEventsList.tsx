// VIEW: catalog list after posting. A generation guard prevents stale reads from replacing newer results.
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPostedEvents, type CampusEvent, type EventCatalogPort } from '../controller/postEvent'
import { displayDate, displayTime } from '../controller/findEvents'

export function PostedEventsList({ catalog, shared, revision }: {
  catalog: EventCatalogPort
  shared: boolean
  revision: number
}) {
  const [posted, setPosted] = useState<{ events: CampusEvent[]; error: string | null; loading: boolean }>({
    events: [], error: null, loading: true,
  })
  const generation = useRef(0)
  const refresh = useCallback(async () => {
    const request = ++generation.current
    setPosted(current => ({ ...current, loading: true }))
    const result = await loadPostedEvents(catalog)
    if (request === generation.current) setPosted({ ...result, loading: false })
  }, [catalog])
  useEffect(() => {
    void refresh()
    return () => { generation.current++ }
  }, [refresh, revision])

  return (
    <section className="posted-events" aria-labelledby="posted-heading">
      <h3 id="posted-heading">Posted events <small>{shared ? 'shared catalog' : 'this browser only'}</small></h3>
      {posted.loading && posted.events.length === 0 ? <p className="library-empty">Loading posted events…</p>
        : posted.error ? <p className="error" role="alert">{posted.error}
            <button type="button" className="undo-button" onClick={refresh}>Try again</button></p>
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
