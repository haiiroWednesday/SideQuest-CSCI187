import { useCallback, useEffect, useRef, useState } from 'react'
import { loadBrowseDetail, type BrowseDetailResult } from '../controller/browseDetail'
import type { EventCatalogPort } from '../controller/postEvent'

export type BrowseDetailState = ({ id: string } & ({ status: 'loading' } | BrowseDetailResult)) | null

/** Only the newest selection may update the detail panel. */
export function useBrowseDetail(catalog: EventCatalogPort) {
  const [state, setState] = useState<BrowseDetailState>(null)
  const generation = useRef(0)

  const open = useCallback((id: string) => {
    const request = ++generation.current
    setState({ id, status: 'loading' })
    void loadBrowseDetail(catalog, id).then(result => {
      if (request === generation.current) setState({ id, ...result })
    })
  }, [catalog])

  const retry = useCallback(() => {
    if (state) open(state.id)
  }, [open, state])

  // Ignore any lookup that completes after a catalog replacement or unmount.
  useEffect(() => () => { generation.current++ }, [catalog])

  return { state, open, retry }
}
