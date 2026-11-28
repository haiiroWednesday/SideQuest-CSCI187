// VIEW: Discover's map mode, in a frame like the Map page. Only the events Discover shows as
// fitting your free time are sent to it. Both sides check the message origin.
import { useEffect, useRef, useState } from 'react'
import type { MapEventRow } from '../controller/presentMap'
import './map.css'
/**
 * Discover's map mode: the same campus map, showing only the events that fit your free time.
 * Markers grow out of their building with a "+3" count; tapping one opens that event's card.
 */
export function DiscoverMap({ rows, onOpenEvent }: { rows: readonly MapEventRow[]; onOpenEvent: (id: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const payload = JSON.stringify(rows)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow || !e.data) return
      if (e.data.type === 'sq-map-ready') setReady(true)
      if (e.data.type === 'sq-open' && typeof e.data.id === 'string') onOpenEvent(e.data.id)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onOpenEvent])
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: 'sq-events', events: JSON.parse(payload) }, window.location.origin)
  }, [ready, payload])
  return (
    <div className="sq-disc-map">
      <iframe ref={frame} className="sq-disc-map-frame" allow="geolocation" src="map/index.html?embed=1&mode=discover"
        title={`Campus map with ${rows.length} ${rows.length === 1 ? 'event' : 'events'} that fit your free time`} />
    </div>
  )
}
