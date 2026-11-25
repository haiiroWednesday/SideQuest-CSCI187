import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSharedScheduleController, type SharedScheduleResult } from '../controller/sharedSchedule'
import { createAccountScheduleController } from '../controller/accountData'
import type { PersonalStorePort } from '../controller/personalClient'
import type { EventCatalogPort } from '../controller/postEvent'
import { SCHEDULE_RECOVERY_CONFIRMATION } from './scheduleRecovery'

/** Signed in, plans live in the account (`store`); signed out, on this device as before. */
export function useSharedSchedule(catalog: EventCatalogPort, store?: PersonalStorePort | null) {
  const controller = useMemo(() => store
    ? createAccountScheduleController(catalog, store)
    : createSharedScheduleController(catalog), [catalog, store])
  const [result, setResult] = useState(() => controller.initial())
  // Signing in or out swaps where plans live; start from that place's first state.
  const shown = useRef(controller)
  if (shown.current !== controller) { shown.current = controller; setResult(controller.initial()) }
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
  useEffect(() => {
    void refresh()
    const onStorage = (event: StorageEvent) => { if (controller.handlesStorageChange(event)) void refresh() }
    window.addEventListener('storage', onStorage)
    return () => { generation.current++; window.removeEventListener('storage', onStorage) }
  }, [controller, refresh])
  return {
    ...result, revision: revision.current, refresh,
    add: (id: string) => run(() => controller.add(id)),
    remove: (id: string) => run(() => controller.remove(id)),
    recover: () => {
      if (window.confirm(SCHEDULE_RECOVERY_CONFIRMATION)) {
        void run(() => controller.recover())
      }
    },
  }
}
