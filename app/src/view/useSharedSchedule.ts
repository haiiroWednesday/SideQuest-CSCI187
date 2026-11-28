import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSharedScheduleController, type SharedScheduleResult } from '../controller/sharedSchedule'
import { createAccountScheduleController } from '../controller/accountData'
import type { PersonalStorePort } from '../controller/personalClient'
import type { EventCatalogPort } from '../controller/postEvent'
import { SCHEDULE_RECOVERY_CONFIRMATION } from './scheduleRecovery'
import { addedText, removedText } from '../controller/planFeedback'

/** The last plan change, so its toast can offer Undo. `revision` tells one change from the next. */
export type PlanChange = { kind: 'added' | 'removed'; ids: string[]; revision: number }

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
  // The newest result, for the titles of plans a removal is about to take away.
  const latest = useRef(result)
  latest.current = result
  const [change, setChange] = useState<PlanChange | null>(null)
  const run = useCallback(async (action: () => Promise<SharedScheduleResult>, describe?: (before: SharedScheduleResult, after: SharedScheduleResult) => { result: SharedScheduleResult; change: Omit<PlanChange, 'revision'> | null }, background = false) => {
    const current = ++generation.current
    const before = latest.current
    if (!background) setResult(previous => ({ ...previous, loading: true }))
    let next = await action()
    let made: Omit<PlanChange, 'revision'> | null = null
    if (describe) ({ result: next, change: made } = describe(before, next))
    if (generation.current === current) {
      revision.current += 1
      setResult(next)
      setChange(made ? { ...made, revision: revision.current } : null)
    }
  }, [])
  const titleOf = (from: SharedScheduleResult, id: string) => from.schedule.entries.find(entry => entry.event.id === id)?.event.title
  /** Plans that were in My Schedule before and are gone after: the toast names each one. */
  const removedFrom = (ids: readonly string[]) => (before: SharedScheduleResult, after: SharedScheduleResult) => {
    const gone = ids.filter(id => before.schedule.ids.includes(id) && !after.schedule.ids.includes(id))
    if (!gone.length || after.error) return { result: after, change: null }
    const titles = gone.flatMap(id => titleOf(before, id) ?? [])
    return { result: { ...after, warning: null, message: removedText(titles) }, change: { kind: 'removed' as const, ids: gone } }
  }
  const addedTo = (ids: readonly string[]) => (before: SharedScheduleResult, after: SharedScheduleResult) => {
    const fresh = ids.filter(id => !before.schedule.ids.includes(id) && after.schedule.ids.includes(id))
    if (!fresh.length) return { result: after, change: null }
    const message = fresh.length > 1 ? addedText(fresh.length) : after.message
    return { result: { ...after, message, warning: fresh.length > 1 ? null : after.warning }, change: { kind: 'added' as const, ids: fresh } }
  }
  const refresh = useCallback(() => run(() => controller.read()), [controller, run])
  const refreshInBackground = useCallback(() => run(() => controller.read(), undefined, true), [controller, run])
  useEffect(() => {
    void refresh()
    const onStorage = (event: StorageEvent) => { if (controller.handlesStorageChange(event)) void refresh() }
    window.addEventListener('storage', onStorage)
    return () => { generation.current++; window.removeEventListener('storage', onStorage) }
  }, [controller, refresh])
  return {
    ...result, revision: revision.current, refresh, refreshInBackground,
    change,
    add: (id: string) => run(() => controller.add(id), addedTo([id])),
    /** "Plan all": one toast that counts what was added ("2 plans added."), never the last title alone. */
    addMany: (ids: readonly string[]) => run(async () => {
      let last = await controller.read()
      for (const id of ids) {
        last = await controller.add(id)
        if (last.error) return last
      }
      return last
    }, addedTo(ids)),
    remove: (id: string) => run(() => controller.remove(id), removedFrom([id])),
    /** "Keep this, remove conflicts": one change, one toast naming every plan removed. */
    removeMany: (ids: readonly string[]) => run(async () => {
      let last = await controller.read()
      for (const id of ids) {
        last = await controller.remove(id)
        if (last.error) return last
      }
      return last
    }, removedFrom(ids)),
    recover: () => {
      if (window.confirm(SCHEDULE_RECOVERY_CONFIRMATION)) {
        void run(() => controller.recover())
      }
    },
  }
}
