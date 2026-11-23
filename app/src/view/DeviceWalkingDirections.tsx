// VIEW: optional device permission and external walking-directions handoff.
// This widget never infers a campus route or silently shares a location.
import { useEffect, useId, useRef, useState } from 'react'
import { googleMapsVenueSearchUrl, googleMapsWalkingDirectionsUrl } from '../controller/campusMapLinks'
import { requestDeviceLocation, type DeviceLocationResult } from '../controller/deviceLocation'
import './device-directions.css'

type State = { phase: 'idle' | 'requesting' } |
  { phase: 'ready'; url: string } |
  { phase: 'error'; reason: Exclude<DeviceLocationResult, { status: 'ready' }>['reason'] }

const messages: Record<Exclude<DeviceLocationResult, { status: 'ready' }>['reason'], string> = {
  unsupported: 'Device location is unavailable in this browser. You can still search the venue in Maps.',
  denied: 'Location access was denied. You can still search the venue in Maps.',
  unavailable: 'Your location could not be determined. You can still search the venue in Maps.',
  timeout: 'The location request took too long. You can still search the venue in Maps.',
}

export function DeviceWalkingDirections({ location }: { location: string }) {
  const id = useId()
  const requestId = useRef(0)
  const [state, setState] = useState<State>({ phase: 'idle' })
  useEffect(() => {
    requestId.current += 1
    setState({ phase: 'idle' })
    return () => { requestId.current += 1 }
  }, [location])

  if (!googleMapsVenueSearchUrl(location)) return null

  const request = async () => {
    const current = ++requestId.current
    setState({ phase: 'requesting' })
    const found = await requestDeviceLocation()
    if (requestId.current !== current) return
    if (found.status === 'error') {
      setState({ phase: 'error', reason: found.reason })
      return
    }
    const url = googleMapsWalkingDirectionsUrl(location, found.coordinates)
    setState(url ? { phase: 'ready', url } : { phase: 'error', reason: 'unavailable' })
  }

  return (
    <section className="sq-device-directions" aria-labelledby={id + '-heading'}>
      <h3 id={id + '-heading'}>Walking directions</h3>
      <p>Optional: request your device location. SideQuest will keep it in this page only. If you open directions,
        Google Maps receives your starting coordinates and the event's stated venue.</p>
      <button type="button" onClick={() => { void request() }} disabled={state.phase === 'requesting'}>
        {state.phase === 'requesting' ? 'Checking location…' : 'Use my location'}
      </button>
      {state.phase === 'requesting' && <p role="status">Requesting device location permission…</p>}
      {state.phase === 'error' && <p role="status">{messages[state.reason]}</p>}
      {state.phase === 'ready' && (
        <p role="status">
          Location available for this page.{' '}
          <a href={state.url} target="_blank" rel="noopener noreferrer">
            Open walking directions in Google Maps
          </a>
        </p>
      )}
      <small>SideQuest does not calculate this route. Check that Google Maps found the correct
        destination and an appropriate accessible entrance before traveling.</small>
    </section>
  )
}
