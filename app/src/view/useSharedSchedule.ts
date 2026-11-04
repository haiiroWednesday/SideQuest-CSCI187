import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSharedScheduleController, type SharedScheduleResult } from '../controller/sharedSchedule'
import type { EventCatalogPort } from '../controller/postEvent'

export function useSharedSchedule(catalog: EventCatalogPort) {
  const controller = useMemo(() => createSharedScheduleController(catalog), [catalog])
  const [result, setResult] = useState(() => controller.initial())
  // Counts finished reads and actions, so the same message text can be shown again after a new action.
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)
  const run = useCallback(async (action: () => Promise<SharedScheduleResult>) => {
    const current = ++generation.current
    setResult(previous => ({ ...previous, loading: true }))
    const next = await action()
    if (generation.current === current) { setResult(next); setRevision(value => value + 1) }
  }, [])
  const refresh = useCallback(() => run(() => controller.read()), [controller, run])
  useEffect(() => {
    void refresh()
    const onStorage = (event: StorageEvent) => { if (controller.handlesStorageChange(event)) void refresh() }
    window.addEventListener('storage', onStorage)
    return () => { generation.current++; window.removeEventListener('storage', onStorage) }
  }, [controller, refresh])
  return {
    ...result, revision, refresh,
    add: (id: string) => run(() => controller.add(id)),
    remove: (id: string) => run(() => controller.remove(id)),
    recover: () => {
      if (window.confirm('Replace unreadable schedule data with the valid plan IDs currently loaded? Invalid entries will be discarded. Original events will not change.')) {
        void run(() => controller.recover())
      }
    },
  }
}
