import { useEffect, useRef } from 'react'
import { connectCatalogLive } from '../controller/catalogRealtime'

// The shared EventCatalog remains authoritative. WebSocket messages only ask
// Discover to re-read it, so we never trust push payloads as event records.
// The socket itself lives in the controller (controller/catalogRealtime).
export function useCatalogLiveUpdates(enabled: boolean, refresh: () => Promise<void>) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!enabled) return
    return connectCatalogLive(() => { void refreshRef.current() })
  }, [enabled])
}
