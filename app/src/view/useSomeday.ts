import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSomedayController, type IntentionStatus } from '../controller/someday'

export function useSomeday() {
  const controller = useMemo(() => createSomedayController(), [])
  const [state, setState] = useState(controller.read)
  const refresh = useCallback(() => setState(controller.read()), [controller])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (controller.handlesStorageChange(event.key)) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [controller, refresh])
  const add = (title: string, note: string): boolean => {
    const next = controller.add(title, note)
    setState(next)
    return next.error === null
  }
  return {
    ...state, refresh, add,
    link: (id: string, eventId: string | null) => setState(controller.link(id, eventId)),
    setStatus: (id: string, status: IntentionStatus) => setState(controller.setStatus(id, status)),
    recover: () => {
      if (window.confirm('Replace unreadable Someday data with an empty list? This cannot be undone.')) {
        setState(controller.recover())
      }
    },
  }
}
