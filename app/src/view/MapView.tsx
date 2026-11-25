// VIEW: the SideQuest campus map. The drawn map is its own page (public/map),
// shown in a frame. The app sends it the listed events; the map pins only
// venues whose text names a place on the map, and asks the app to open an
// event when one is tapped. Both sides check the message origin.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CampusEvent } from '../controller/postEvent'
import { presentMapEvents } from '../controller/presentMap'
import type { MapMarkerStyle } from '../controller/viewPreferences'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import './map.css'

export function MapView({ routes, plannedCount, events, plannedIds, postedIds = [], focus, walk = null, now, onOpenEvent, designReview = false }: {
  routes: SideQuestRoutes
  plannedCount: number
  events: CampusEvent[]
  plannedIds: string[]
  /** A place to walk to: the map draws a route from your location (asks for location first). */
  walk?: string | null
  /** A venue to show, from a "Find it on the map" link. */
  focus: string | null
  now: Date
  postedIds?: readonly string[]
  onOpenEvent: (id: string) => void
  /** Design review only: the switch between marker styles. */
  designReview?: boolean
}) {
  const markers: MapMarkerStyle = 'ticket'
  const frame = useRef<HTMLIFrameElement>(null)
  const area = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)
  const [height, setHeight] = useState<number | null>(null)
  const payload = JSON.stringify(presentMapEvents(events, plannedIds, now, postedIds))

  // Fill the space between the masthead and the phone tab bar.
  useLayoutEffect(() => {
    const fit = () => {
      const top = area.current?.getBoundingClientRect().top ?? 0
      const nav = document.querySelector<HTMLElement>('.sq-nav')
      const navTop = nav && getComputedStyle(nav).position === 'fixed' ? nav.getBoundingClientRect().top : window.innerHeight
      // The compact look zooms the page; screen pixels must be turned back into CSS pixels, or the map stops short of the tab bar.
      const el = area.current, z = el && el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1
      setHeight(Math.max(320, Math.round((navTop - top) / (z || 1))))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

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
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: 'sq-style', style: markers }, window.location.origin)
  }, [ready, markers])
  useEffect(() => {
    if (ready && focus) frame.current?.contentWindow?.postMessage({ type: 'sq-focus', location: focus }, window.location.origin)
  }, [ready, focus])
  useEffect(() => {
    if (ready && walk) frame.current?.contentWindow?.postMessage({ type: 'sq-walk', location: walk }, window.location.origin)
  }, [ready, walk])

  return (
    <div className="sq-discover-page sq-map-page">
      <SideQuestHeader routes={routes} active="map" plannedCount={plannedCount} />
      <main className="sq-map-main" id="content" ref={area} aria-labelledby="sq-map-title">
        <h1 id="sq-map-title" className="sq-visually-hidden">Campus map</h1>
        {/* Flag markers were dropped (Nov 2026): every event marker on the map is a ticket. */}
        <iframe ref={frame} className="sq-map-frame" allow="geolocation" src={`map/index.html?embed=1${designReview ? '&motion=1' : ''}`} title="SideQuest campus map with this week's events"
          style={height ? { height } : undefined} />
      </main>
    </div>
  )
}
