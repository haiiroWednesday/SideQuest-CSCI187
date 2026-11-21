import { useEffect, useRef } from 'react'
import { isPublicCatalogRefreshNotice } from '../controller/catalogRealtime'

// The shared EventCatalog remains authoritative. WebSocket messages only ask
// Discover to re-read it, so we never trust push payloads as event records.
export function useCatalogLiveUpdates(enabled: boolean, refresh: () => Promise<void>) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!enabled || typeof WebSocket === 'undefined') return

    let closed = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    let delay = 500

    const requestRefresh = () => {
      if (refreshTimer !== undefined) return
      // A burst of new events creates one catalog GET instead of a request per ID.
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined
        if (!closed) void refreshRef.current()
      }, 100)
    }

    const reconnect = () => {
      if (closed) return
      reconnectTimer = setTimeout(connect, delay)
      delay = Math.min(delay * 2, 15_000)
    }

    function connect() {
      if (closed) return
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      try { socket = new WebSocket(`${protocol}//${location.host}/api/events/live`) }
      catch { reconnect(); return }

      const current = socket
      current.onopen = () => {
        delay = 500
        // Reconcile events posted during connection setup or a prior outage.
        requestRefresh()
      }
      current.onmessage = message => {
        if (typeof message.data !== 'string') return
        try {
          if (isPublicCatalogRefreshNotice(JSON.parse(message.data))) requestRefresh()
        } catch { /* Ignore malformed notifications; manual refresh remains available. */ }
      }
      current.onerror = () => { current.close() }
      current.onclose = reconnect
    }

    connect()
    return () => {
      closed = true
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
      if (refreshTimer !== undefined) clearTimeout(refreshTimer)
      socket?.close()
    }
  }, [enabled])
}
