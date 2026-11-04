import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPostedEvents, type CampusEvent, type EventCatalogPort } from '../controller/postEvent'

// Posting, availability search, and the event list share one catalog snapshot.
export function useCatalogEvents(catalog: EventCatalogPort, enabled = true) {
  const [state, setState] = useState<{
    events: CampusEvent[]; error: string | null; loading: boolean; revision: number
  }>({ events: [], error: null, loading: true, revision: 0 })
  const request = useRef(0)
  const refresh = useCallback(async () => {
    const current = ++request.current
    setState(previous => ({ ...previous, error: null, loading: true }))
    const result = await loadPostedEvents(catalog)
    // An initial read must not overwrite a newer refresh after a post.
    if (request.current === current) {
      setState({ ...result, loading: false, revision: current })
    }
  }, [catalog])

  useEffect(() => {
    if (!enabled) return
    void refresh()
    return () => { request.current++ }
  }, [enabled, refresh])

  return { ...state, refresh }
}

export type CatalogEvents = ReturnType<typeof useCatalogEvents>
