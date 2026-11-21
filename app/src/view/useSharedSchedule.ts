import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createSharedScheduleController,
  type SharedScheduleResult,
} from '../controller/sharedSchedule'
import type { EventCatalogPort } from '../controller/postEvent'
import { SCHEDULE_RECOVERY_CONFIRMATION } from './scheduleRecovery'

export function useSharedSchedule(catalog: EventCatalogPort) {
  const controller = useMemo(() => createSharedScheduleController(catalog), [catalog])
  const [result, setResult] = useState(() => controller.initial())
  const generation = useRef(0)
  // Increment for every completed action so repeated identical feedback gets
  // a new toast identity without modifying persisted plans or catalog data.
  const revision = useRef(0)
  const run = useCallback(async (action: () => Promise<SharedScheduleResult>) => {
    const current = ++generation.current
    setResult(previous => ({ ...previous, loading: true }))
    const next = await action()
    if (generation.current === current) {
      revision.current += 1
      setResult(next)
    }
  }, [])
  const refresh = useCallback(() => run(() => controller.read()), [controller, run])
  // Close out older asynchronous operations before unmount or controller replacement.
  const invalidatePendingActions = useCallback(() => {
    generation.current += 1
  }, [])
  useEffect(() => {
    void refresh()
    const onStorage = (event: StorageEvent) => {
      if (controller.handlesStorageChange(event)) void refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      invalidatePendingActions()
      window.removeEventListener('storage', onStorage)
    }
  }, [controller, refresh, invalidatePendingActions])
  return {
    ...result,
    revision: revision.current,
    refresh,
    add: (id: string) => run(() => controller.add(id)),
    remove: (id: string) => run(() => controller.remove(id)),
    recover: () => {
      if (window.confirm(SCHEDULE_RECOVERY_CONFIRMATION)) {
        void run(() => controller.recover())
      }
    },
  }
}
