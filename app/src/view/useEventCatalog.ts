import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPostedEvents, type CampusEvent, type EventCatalogPort } from '../controller/postEvent'

export function useEventCatalog(catalog: EventCatalogPort) {
  const [state, setState] = useState<{ events: CampusEvent[]; error: string | null; loading: boolean }>({ events: [], error: null, loading: true })
  const generation = useRef(0)
  const refresh = useCallback(async () => {
    const request = ++generation.current
    setState(previous => ({ ...previous, loading: true }))
    const result = await loadPostedEvents(catalog)
    if (request === generation.current) setState({ ...result, loading: false })
  }, [catalog])
  useEffect(() => {
    void refresh()
    return () => { generation.current++ }
  }, [refresh])
  return { ...state, refresh }
}
