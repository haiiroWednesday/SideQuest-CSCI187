import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPostedEvents, type CampusEvent, type EventCatalogPort } from '../controller/postEvent'

// Posting, availability search, and the event list share one catalog snapshot.
export function useCatalogEvents(catalog: EventCatalogPort, enabled = true, refreshKey = 0) {
  const [state, setState] = useState<{
    events: CampusEvent[]
    error: string | null
    loading: boolean
    revision: number
  }>({ events: [], error: null, loading: true, revision: 0 })
  const generation = useRef(0)
  const refresh = useCallback(async () => {
    const request = ++generation.current
    setState(previous => ({ ...previous, error: null, loading: true }))
    const result = await loadPostedEvents(catalog)
    // An initial read must not overwrite a newer refresh after a post.
    if (generation.current === request) {
      setState({ ...result, loading: false, revision: request })
    }
  }, [catalog])

  // Invalidate outstanding reads when the View stops observing this catalog.
  const invalidatePendingReads = useCallback(() => {
    generation.current += 1
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refresh()
    return () => invalidatePendingReads()
  }, [enabled, refresh, refreshKey, invalidatePendingReads])

  return { ...state, refresh }
}

export type CatalogEvents = ReturnType<typeof useCatalogEvents>
